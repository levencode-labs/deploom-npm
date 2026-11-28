"""Reproduce a coverage map from reviewed corpus bytes and verified evidence.

Offline by default and with explicit snapshot inputs: no fetching, installs,
fixture execution, cache writes, or project reads. A signed publication export
proves the supplied bytes, not current availability of its live endpoint.
"""
import argparse
import hashlib
import json
import re
import sqlite3
import subprocess
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

from coverage_identity import IDENTITY_VERSION, recommendation_id
from evidence_scopes import annotate_corpus, canonical

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ci"))
import stage_b_receipts

DEFINITIONS = {
    "records": "Distinct validated record IDs in one logical corpus. v2 and v3 are representations, never summed.",
    "distinctRecommendations": "Groups with identical package, kind, sorted exact transitions and manager support, sorted verbatim conditions, ordered actions and verification. Provenance and evidence levels are retained separately. No natural-language equivalence is inferred.",
    "mergedRecords": "Records minus distinctRecommendations; each equivalent record contributes one additional provenance record.",
    "packages": "Distinct public npm package names present in validated records.",
    "exactTransitions": "Distinct (package, exact from version, exact to version) tuples; not major-line candidates.",
    "packageManagers": "Records and recommendations declaring a manager; manager rows overlap and must not be summed.",
    "evidenceLevels": "Explicit reviewed scope levels; a group with sources at different levels appears in each corresponding group count. Legacy unscoped evidence is UNKNOWN.",
    "platforms": "Record IDs bound to complete retained qualification reports for that platform; absence means not evidenced here, not unsupported.",
    "browsers": "Record IDs bound to retained browser execution reports; emulated mobile viewports do not count as physical-device coverage.",
    "prepared": "Reviewed source corpus; no publisher revision or signature is claimed until signed snapshot bytes are supplied.",
    "published": "Optional signed export labelled as publication evidence. Signatures and all shards are verified offline; live endpoint availability is not checked.",
    "local": "Optional existing installed cache, read without refreshing. Complete signed indices and shards are verified separately from the prepared corpus.",
    "projectCompatibility": "Not measured. Records, metadata checks, CI jobs and fixture executions are never a project-compatibility percentage. ADVISORY_ONLY; recipient-project verification remains required.",
}


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def bounded(path, limit=8_000_000):
    path = Path(path)
    with path.open("rb") as stream:
        raw = stream.read(limit + 1)
    require(len(raw) <= limit, "Input exceeds bound: " + path.name)
    return raw


def relative(root, name):
    path = (root / name).resolve()
    require(path.is_relative_to(root.resolve()), "Input path escapes repository")
    return path


def metrics(rows):
    grouped = defaultdict(list)
    for row in rows:
        grouped[recommendation_id(row)].append(row)
    managers, levels = {}, {}
    for key, target, field in (("packageManagers", managers, None), ("evidenceScope", levels, "level")):
        values = sorted({value for row in rows for value in
                         ([row.get(key, {}).get(field, "UNKNOWN")] if field else row[key])})
        for value in values:
            subset = [row for row in rows if (row.get(key, {}).get(field, "UNKNOWN") == value
                      if field else value in row[key])]
            target[value] = {"records": len(subset),
                             "distinctRecommendations": len({recommendation_id(row) for row in subset})}
    transitions = {(row["package"], item["from"], item["to"])
                   for row in rows for item in row["verifiedTransitions"]}
    return {
        "records": len(rows), "distinctRecommendations": len(grouped),
        "mergedRecords": len(rows) - len(grouped),
        "packages": len({row["package"] for row in rows}), "exactTransitions": len(transitions),
        "packageManagers": managers, "evidenceLevels": levels,
    }


def qualification_coverage(root, bundle, rows):
    """Accept only retained, source-bound reports after the complete B verifier."""
    folder = relative(root, bundle)
    manifest_raw = bounded(folder / "manifest.json")
    manifest = json.loads(manifest_raw)
    commit = manifest["source"]["commit"]
    run_id = manifest["qualification"]["workflowRunId"]
    require(manifest["qualification"]["status"] == "passed", "Qualification did not pass")
    verifier = bounded(relative(root, manifest["verification"]["verifier"]["sourcePath"]))
    require(digest(verifier) == manifest["verification"]["verifier"]["sha256"], "Qualification verifier changed")
    for artifact in manifest["artifacts"]:
        archive = artifact["archive"]
        archive_path = relative(folder, archive["path"])
        raw = bounded(archive_path, 16_000_000)
        require(len(raw) == archive["bytes"] and digest(raw) == archive["sha256"]
                and artifact["githubDigest"] == "sha256:" + digest(raw), "Retained artifact bytes changed")
        with zipfile.ZipFile(archive_path) as handle:
            require(sorted(handle.namelist()) == sorted(item["path"] for item in artifact["members"]),
                    "Retained archive member set changed")
            for item in artifact["members"]:
                raw = bounded(relative(folder, artifact["extractedDirectory"] + "/" + item["path"]))
                require(len(raw) == item["bytes"] and digest(raw) == item["sha256"]
                        and raw == handle.read(item["path"]), "Retained member changed")
    verified = stage_b_receipts.verify(root, folder / "artifacts", commit, run_id)
    acceptance = bounded(relative(folder, manifest["verification"]["acceptancePath"]))
    require(canonical(verified) == acceptance
            and digest(acceptance) == manifest["verification"]["acceptanceSha256"], "Qualification acceptance differs")
    platforms, browsers = defaultdict(set), defaultdict(set)
    observations = []
    for receipt_path in sorted((folder / "artifacts").rglob("receipt.json")):
        receipt = json.loads(bounded(receipt_path))
        report = json.loads(bounded(receipt_path.parent / receipt["execution"]["path"]))
        suite = receipt["suite"]
        source = ("https://github.com/levencode-labs/deploom-npm/blob/" + commit + "/"
                  + stage_b_receipts.SUITES[suite] + "/check.cjs")
        claims = (report["results"][0]["cases"] if suite == "package-managers" else
                  [report["transition"]] if suite == "typescript-workspaces" else report["claims"])
        tuples = {(item["package"], item["from"], item["to"]) for item in claims}
        bound = [row["id"] for row in rows if row["evidence"]["source"] == source
                 and receipt["manager"] in row["packageManagers"]
                 and (row["package"], row["evidence"]["claim"]["from"], row["evidence"]["claim"]["to"]) in tuples]
        platform = stage_b_receipts.RUNNERS[receipt["runner"]]
        platforms[platform].update(bound)
        observation = {"suite": suite, "platform": platform, "manager": receipt["manager"],
                       "recordIds": sorted(bound), "reportSha256": receipt["execution"]["sha256"],
                       "report": str(receipt_path.parent.relative_to(root)) + "/" + receipt["execution"]["path"]}
        if suite == "react-ui":
            tools = report["tools"]
            require(tools["browserDistribution"] == "chromium-headless-shell", "Unreviewed browser distribution")
            browsers["Chromium"].update(bound)
            observation["browser"] = {"name": "Chromium", "version": tools["browser"],
                                      "revision": tools["browserRevision"], "binarySha256": tools["browserBinarySha256"],
                                      "viewports": ["desktop", "emulated-mobile"], "physicalDevice": False}
        observations.append(observation)
    return {
        "input": {"path": bundle + "/manifest.json", "sha256": digest(manifest_raw)},
        "sourceCommit": commit, "runId": run_id, "workflowUrl": manifest["qualification"]["workflowUrl"],
        "acceptanceSha256": digest(acceptance), "verifiedLegs": len(verified["verifiedLegs"]),
        "platforms": {key: sorted(value) for key, value in sorted(platforms.items())},
        "browsers": {key: sorted(value) for key, value in sorted(browsers.items())},
        "observations": observations,
    }


def _snapshot(read, present, prepared, *, kind):
    from deploom_mcp import shared_records_v2, shared_records_v3
    editions, all_rows = {}, {}
    for version, consumer in ((2, shared_records_v2), (3, shared_records_v3)):
        if not present(version):
            continue
        raw, signature = read(version, "index.json", 2_000_000), read(version, "index.sig", 64)
        index = consumer.verified_index(raw, signature)
        rows = []
        for bucket, descriptors in sorted(index["buckets"].items()):
            for descriptor in descriptors:
                payload = read(version, descriptor["path"], descriptor["bytes"])
                rows.extend(consumer.verified_shard(payload, descriptor, bucket))
        require(len(rows) == len({row["id"] for row in rows}) == index["recordCount"], "Snapshot has duplicate or missing records")
        all_rows[version] = sorted(rows, key=lambda row: row["id"])
        editions[f"v{version}"] = {"revision": index["revision"], "indexSha256": digest(raw),
                                   "sourceSha256": index["sourceSha256"], "signature": "VERIFIED",
                                   "signatureDomain": consumer.DOMAIN.decode().rstrip("\0"),
                                   "records": len(rows), "shards": sum(map(len, index["buckets"].values()))}
    require(editions, "No signed snapshot supplied")
    if 2 in all_rows and 3 in all_rows:
        require(editions["v2"]["revision"] == editions["v3"]["revision"], "Snapshot edition revisions differ")
        legacy = [{key: value for key, value in row.items() if key != "evidenceScope"} for row in all_rows[3]]
        require(legacy == all_rows[2], "v2 and v3 do not represent the same corpus")
    selected = 3 if 3 in all_rows else 2
    rows = all_rows[selected]
    expected = sorted(prepared, key=lambda row: row["id"])
    if selected == 2:
        expected = [{key: value for key, value in row.items() if key != "evidenceScope"} for row in expected]
    return {"status": "VERIFIED_SIGNED_SNAPSHOT", "kind": kind, "selectedEdition": f"v{selected}",
            "editions": editions, "metrics": metrics(rows), "matchesPreparedCorpus": rows == expected,
            "liveAvailability": "NOT_CHECKED", "freshness": "NOT_DEFINED_BY_KNOWLEDGE_INDEX",
            "projectStatus": "UNKNOWN", "advisoryOnly": True}


def publication_snapshot(directory, prepared):
    directory = Path(directory)
    def read(version, name, limit):
        return bounded(relative(directory, f"v{version}/" + name), limit)
    return _snapshot(read, lambda version: (directory / f"v{version}/index.json").is_file(),
                     prepared, kind="publication-export")


def local_snapshot(directory, prepared):
    directory = Path(directory)
    connections, identities = {}, {}
    def identity(path):
        stat = path.stat()
        return (stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns)
    try:
        for version in (2, 3):
            path = directory / f"signed-records-v{version}.sqlite"
            if path.exists():
                require(not any(Path(str(path) + suffix).exists() for suffix in ("-wal", "-journal")),
                        "Local cache WAL or rollback journal is present; use a stable read-only export")
                identities[version] = (path, identity(path))
                connections[version] = sqlite3.connect(path.resolve().as_uri() + "?mode=ro&immutable=1", uri=True)
        def read(version, name, limit):
            db = connections[version]
            if name in ("index.json", "index.sig"):
                entry = db.execute("SELECT raw,sig FROM edition WHERE id=1").fetchone()
                raw = entry[0 if name == "index.json" else 1] if entry else None
            else:
                entry = db.execute("SELECT data FROM shard WHERE path=?", (name,)).fetchone()
                raw = entry[0] if entry else None
            require(isinstance(raw, bytes) and len(raw) <= limit, "Missing or oversized local snapshot member")
            return raw
        result = _snapshot(read, lambda version: version in connections, prepared, kind="installed-local-cache")
        for path, before in identities.values():
            require(identity(path) == before
                    and not any(Path(str(path) + suffix).exists() for suffix in ("-wal", "-journal")),
                    "Local cache changed during verification; retry with a stable snapshot")
        return result
    finally:
        for db in connections.values():
            db.close()


def build(root=ROOT, *, published=None, local=None):
    root = Path(root)
    config_raw = bounded(root / "knowledge/coverage-inputs.json")
    config = json.loads(config_raw)
    require(set(config) == {"schema", "trustedCommit", "qualificationBundles"} and config["schema"] == 1,
            "Invalid coverage input catalog")
    trusted = config["trustedCommit"]
    require(isinstance(trusted, str) and re.fullmatch(r"[a-f0-9]{40}", trusted), "Expected exact trusted commit")
    require(isinstance(config["qualificationBundles"], list) and len(config["qualificationBundles"]) <= 64
            and all(isinstance(item, str) for item in config["qualificationBundles"]), "Invalid qualification bundle list")
    subprocess.run(["git", "merge-base", "--is-ancestor", trusted, "HEAD"], cwd=root, check=True, timeout=30)
    corpus = bounded(root / "knowledge/v2/records.json")
    ledger = bounded(root / "knowledge/v3/evidence-scopes.json")
    # The existing source verifier uses the repository cwd, not paths from data.
    require(Path.cwd().resolve() == root.resolve(), "Run coverage generation from the repository root")
    scoped = annotate_corpus(corpus, ledger, trusted_commit=trusted)
    rows = json.loads(scoped)["records"]
    evidence = [qualification_coverage(root, bundle, rows) for bundle in config["qualificationBundles"]]
    platforms, browsers = defaultdict(set), defaultdict(set)
    for item in evidence:
        for name, identities in item["platforms"].items(): platforms[name].update(identities)
        for name, identities in item["browsers"].items(): browsers[name].update(identities)
    prepared = {"status": "VERIFIED_PREPARED_CORPUS", "revision": None, "signature": "NOT_SIGNED",
                "v2SourceSha256": digest(corpus), "v3SourceSha256": digest(scoped), "metrics": metrics(rows),
                "platforms": {name: {"records": len(ids), "distinctRecommendations": len({recommendation_id(row) for row in rows if row["id"] in ids}),
                                      "recordIds": sorted(ids)} for name, ids in sorted(platforms.items())},
                "browsers": {name: {"records": len(ids), "distinctRecommendations": len({recommendation_id(row) for row in rows if row["id"] in ids}),
                                     "recordIds": sorted(ids)} for name, ids in sorted(browsers.items())},
                "recordsWithoutPlatformEvidence": len(rows) - len(set().union(*platforms.values())),
                "recordsWithoutBrowserEvidence": len(rows) - len(set().union(*browsers.values())),
                "projectStatus": "UNKNOWN", "advisoryOnly": True}
    sources = json.loads(ledger)["sources"]
    inputs = [{"path": name, "sha256": digest(bounded(root / name))} for name in (
        "knowledge/v2/records.json", "knowledge/v3/evidence-scopes.json", "knowledge/coverage-inputs.json",
        "cache/coverage_map.py", "cache/coverage_identity.py", "cache/evidence_scopes.py", "ci/stage_b_receipts.py",
        ".github/actions/setup-cache-consumer/action.yml", "ci/cache-requirements.txt")]
    inputs.extend(item["input"] for item in evidence)
    packages = []
    for package in sorted({row["package"] for row in rows}):
        subset = [row for row in rows if row["package"] == package]
        packages.append({"package": package, "metrics": metrics(subset),
                         "transitions": [dict(zip(("from", "to"), pair)) for pair in sorted({
                             (item["from"], item["to"]) for row in subset for item in row["verifiedTransitions"]})],
                         "recommendations": [{"id": group_id, "recordIds": sorted(row["id"] for row in subset
                                               if recommendation_id(row) == group_id)}
                                             for group_id in sorted({recommendation_id(row) for row in subset})]})
    result = {"schema": 1, "identityVersion": IDENTITY_VERSION, "definitions": DEFINITIONS,
              "provenance": {"trustedAncestor": trusted, "inputs": inputs,
                             "inputSetSha256": digest(canonical(inputs)), "reviewedSources": len(sources),
                             "retainedInputEntries": sum(len(source["inputs"]) for source in sources)},
              "states": {"prepared": prepared,
                         "published": publication_snapshot(published, rows) if published else {
                             "status": "NOT_OBSERVED", "reason": "No signed publication export supplied", "metrics": None},
                         "local": local_snapshot(local, rows) if local else {
                             "status": "NOT_OBSERVED", "reason": "No installed local cache supplied", "metrics": None}},
              "qualificationEvidence": evidence, "packages": packages}
    return result


def markdown(value, *, russian=False):
    prepared = value["states"]["prepared"]
    data = prepared["metrics"]
    title = "Карта покрытия знаний DepLoom" if russian else "DepLoom knowledge coverage"
    lines = ["# " + title, "", ("Автоматически создано из проверенных входов. " if russian else "Generated from verified inputs. ")
             + "[JSON](coverage-map.json).", ""]
    lines += (["Подготовленный корпус не подтверждает публикацию или наличие данных в локальном клиенте. "
               "Рекомендации остаются ADVISORY_ONLY; проверка проекта получателя обязательна."] if russian else
              ["The prepared corpus does not establish publication or installation in a local client. "
               "Guidance remains ADVISORY_ONLY; recipient-project verification is required."])
    lines += ["", "| " + ("Метрика | Количество" if russian else "Metric | Count") + " |", "| --- | ---: |"]
    names = [("Записи", "Records", "records"), ("Различные рекомендации", "Distinct recommendations", "distinctRecommendations"),
             ("Объединённые записи", "Merged records", "mergedRecords"), ("Пакеты", "Packages", "packages"),
             ("Точные переходы", "Exact transitions", "exactTransitions")]
    for ru, en, key in names: lines.append(f"| {ru if russian else en} | {data[key]} |")
    for key, ru, en in (("evidenceLevels", "Уровни доказательств", "Evidence levels"),
                        ("packageManagers", "Менеджеры пакетов", "Package managers")):
        lines += ["", "## " + (ru if russian else en), "", "| " + ("Уровень / менеджер | Записи | Рекомендации" if russian else
                  "Level / manager | Records | Recommendations") + " |", "| --- | ---: | ---: |"]
        for name, counts in data[key].items():
            lines.append(f"| {name} | {counts['records']} | {counts['distinctRecommendations']} |")
    lines += ["", ("Строки менеджеров и уровней могут пересекаться; их нельзя суммировать." if russian else
                   "Manager and evidence-level rows may overlap; do not sum them."), "",
              "## " + ("Платформы и браузеры" if russian else "Platforms and browsers"), "",
              "| " + ("Подтверждение | Записи | Рекомендации" if russian else "Evidence | Records | Recommendations") + " |", "| --- | ---: | ---: |"]
    for kind in ("platforms", "browsers"):
        for name, counts in prepared[kind].items():
            lines.append(f"| {name} | {counts['records']} | {counts['distinctRecommendations']} |")
    lines += ["", (f"Для {prepared['recordsWithoutPlatformEvidence']} записей в этой карте нет подтверждения платформы; "
                   f"для {prepared['recordsWithoutBrowserEvidence']} нет подтверждения браузера. Это неизвестность, а не несовместимость. "
                   "Мобильный Chromium означает эмуляцию viewport/touch; физические устройства, Firefox, WebKit и macOS не заявлены."
                   if russian else f"{prepared['recordsWithoutPlatformEvidence']} records have no platform evidence in this map; "
                   f"{prepared['recordsWithoutBrowserEvidence']} have no browser evidence. This is unknown coverage, not incompatibility. "
                   "Mobile Chromium is viewport/touch emulation; physical devices, Firefox, WebKit and macOS are not claimed."), "",
              "## " + ("Состояния данных" if russian else "Data states"), "", "| " +
              ("Состояние | Результат | Редакция" if russian else "State | Result | Revision") + " |", "| --- | --- | --- |"]
    for name, state in value["states"].items():
        revisions = ", ".join(f"{key}: {item['revision']}" for key, item in state.get("editions", {}).items()) or "UNKNOWN"
        lines.append(f"| {name} | {state['status']} | {revisions} |")
    lines += ["", ("v2 и v3 представляют один корпус и не складываются. При чтении подписанного экспорта "
                   "проверяются подписи и все шарды, но доступность сайта в этот момент не проверяется. OSV не входит "
                   "в карту миграционных знаний; его свежесть проверяется отдельной диагностикой."
                   if russian else "v2 and v3 represent one corpus and are never added together. Supplied signed exports "
                   "have their signatures and all shards verified; live website availability is not checked. OSV is separate "
                   "from migration knowledge; inspect its freshness through the runtime diagnostic."), "",
              "## " + ("Определения и происхождение" if russian else "Definitions and provenance"), ""]
    lines += (["Рекомендации объединяются только при совпадении пакета, вида, точных переходов, множества менеджеров, "
               "дословных условий, упорядоченных действий и проверок. Условия сохраняют состав совместной миграции. "
               "Заголовок, краткое описание и источник не заменяют эти поля. nodeRef и относительный маршрут остаются разными рекомендациями. "
               "Точное совпадение перехода, уровень доказательств и применимость к вашему проекту — отдельные измерения."] if russian else
              ["Recommendations merge only when package, kind, exact transitions, manager support, verbatim conditions, "
               "ordered actions and verification match. Conditions preserve the joint-migration cohort. Titles, summaries and "
               "sources do not replace these fields. nodeRef and relative navigation remain distinct recommendations. Exact "
               "transition match, evidence level and applicability to your project are separate dimensions."])
    lines += ["", f"- Identity: `{value['identityVersion']}`.", f"- Trusted ancestor: `{value['provenance']['trustedAncestor']}`.",
              f"- Input set SHA-256: `{value['provenance']['inputSetSha256']}`.",
              f"- v2 corpus SHA-256: `{prepared['v2SourceSha256']}`.", f"- v3 corpus SHA-256: `{prepared['v3SourceSha256']}`.",
              f"- Reviewed sources: {value['provenance']['reviewedSources']}; retained input entries: {value['provenance']['retainedInputEntries']}.", ""]
    for evidence in value["qualificationEvidence"]:
        lines.append(f"- [Qualification run {evidence['runId']}]({evidence['workflowUrl']}): "
                     f"{evidence['verifiedLegs']} verified legs; `{evidence['acceptanceSha256']}`.")
    lines += ["", ("Количество записей, CI-заданий и metadata-проверок не означает процент совместимости проектов. "
                   "retainedInputSha256 не подтверждает, что клиент имеет исходные файлы, полный манифест или архивы зависимостей."
                   if russian else "Record counts, CI jobs and metadata checks are not a percentage of project compatibility. "
                   "retainedInputSha256 does not establish that a client has the source files, full manifest or dependency archives."), "",
              "## " + ("Повторная генерация" if russian else "Reproduction"), "", "```sh",
              "python cache/coverage_map.py", "python cache/coverage_map.py --check", "```", "",
              ("Запустите из корня репозитория с зависимостями и потребителем из `.github/actions/setup-cache-consumer`. "
               "Команда не выполняет миграции и не обращается в сеть. CI отклоняет устаревшие JSON/Markdown. "
               "Для проверки фактически скачанных опубликованных данных передайте `--published-dir <export>` с каталогами v2/v3; "
               "для существующего кэша клиента — `--local-cache <cache-root>`. Сохраняйте такой отдельный отчёт через "
               "`--output-dir <directory>`; значения публикации и кэша не выводятся из подготовленного корпуса."
               if russian else "Run from the repository root using dependencies and the consumer pinned by "
               "`.github/actions/setup-cache-consumer`. Generation runs no migrations or network requests. CI rejects stale "
               "JSON/Markdown. To inspect downloaded publication bytes, pass `--published-dir <export>` containing v2/v3 "
               "directories; to inspect an existing client cache, pass `--local-cache <cache-root>`. Save that separate report "
               "with `--output-dir <directory>`; publication and local state are never inferred from the prepared corpus."), ""]
    return "\n".join(lines).encode("utf-8")


def outputs(value, output_dir=None):
    if output_dir:
        folder = Path(output_dir)
        paths = [folder / "coverage-map.json", folder / "COVERAGE.md", folder / "COVERAGE.ru.md"]
    else:
        paths = [ROOT / "docs/coverage-map.json", ROOT / "docs/COVERAGE.md", ROOT / "docs/COVERAGE.ru.md"]
    return dict(zip(paths, [canonical(value), markdown(value), markdown(value, russian=True)]))


def check_outputs(expected):
    stale = [str(path) for path, raw in expected.items() if not path.is_file() or path.read_bytes() != raw]
    require(not stale, "Coverage map is stale; regenerate: " + ", ".join(stale))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--published-dir", type=Path)
    parser.add_argument("--local-cache", type=Path)
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()
    require(not (args.published_dir or args.local_cache) or args.output_dir,
            "Explicit snapshot reports require --output-dir; keep the reproducible source map separate")
    value = build(published=args.published_dir, local=args.local_cache)
    expected = outputs(value, args.output_dir)
    if args.check:
        check_outputs(expected)
    else:
        for path, raw in expected.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
    print(json.dumps({"status": "current" if args.check else "generated", **value["states"]["prepared"]["metrics"]}, sort_keys=True))


if __name__ == "__main__":
    main()
