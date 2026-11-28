"""Select an on-main trust anchor for current CI and historical npm release replay."""
import json
import os
import re
import subprocess
from pathlib import Path

TAG = re.compile(r"refs/tags/npm-v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)")


def git(root, *args):
    return subprocess.check_output(["git", "-C", str(root), *args],
                                   text=True, timeout=30).strip()


def require_ancestor(root, older, newer):
    subprocess.run(["git", "-C", str(root), "merge-base", "--is-ancestor", older, newer],
                   check=True, timeout=30)


def trusted_commit(root: Path, *, env=None):
    """Ordinary CI still requires origin/main to be an ancestor of checkout.

    A tagged historical npm release instead proves the exact checked-out commit
    is reachable from origin/main, matches the release tag, and matches the tracked
    package version. Its own trusted historical tree is then the admission
    boundary. Later main commits cannot retroactively authorize its evidence.
    """
    context = os.environ if env is None else env
    main = git(root, "rev-parse", "--verify", "refs/remotes/origin/main^{commit}")
    head = git(root, "rev-parse", "--verify", "HEAD^{commit}")
    match = TAG.fullmatch(context.get("GITHUB_REF", "")) if context.get("GITHUB_REF_TYPE") == "tag" else None
    if match is None:
        require_ancestor(root, main, head)
        return main
    tag_target = git(root, "rev-parse", "--verify", match.group(0) + "^{commit}")
    if tag_target != head:
        raise ValueError("RELEASE_TAG_HEAD_MISMATCH")
    package = json.loads(git(root, "show", "HEAD:package.json"))
    if package.get("version") != match.group(1):
        raise ValueError("RELEASE_TAG_VERSION_MISMATCH")
    require_ancestor(root, head, main)
    return head
