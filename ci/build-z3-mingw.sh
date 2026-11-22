#!/usr/bin/env bash
# Build the pinned Python binding's own Z3 release with the MinGW-w64 runtime.
set -euo pipefail
archive=z3-solver-4.13.0.0.tar.gz
url=https://files.pythonhosted.org/packages/3a/fd/e3f5850fd04480a942aca9f9f7520d3fa5b57731335c221a11f55bb6d91a/$archive
sha=52588e92aec7cb338fd6288ce93758ae01770f62ca0c80e8f4f2b2333feaf51b
mkdir -p build/solver/output
cd build/solver
curl --fail --location --retry 3 "$url" -o "$archive"
echo "$sha  $archive" | sha256sum --check --strict
tar xzf "$archive"
linkflags='-static -static-libgcc -static-libstdc++ -Wl,--strip-all,--no-insert-timestamp'
launchers=()
if command -v ccache >/dev/null; then
  export CCACHE_COMPILERCHECK=content CCACHE_BASEDIR="$PWD" CCACHE_MAXSIZE=768M
  launchers=(-DCMAKE_C_COMPILER_LAUNCHER=ccache -DCMAKE_CXX_COMPILER_LAUNCHER=ccache)
fi
cmake "${launchers[@]}" -S z3-solver-4.13.0.0/core -B obj -G Ninja \
  -DCMAKE_SYSTEM_NAME=Windows -DCMAKE_SYSTEM_PROCESSOR=AMD64 \
  -DCMAKE_C_COMPILER=x86_64-w64-mingw32-gcc-posix -DCMAKE_CXX_COMPILER=x86_64-w64-mingw32-g++-posix \
  -DCMAKE_RC_COMPILER=x86_64-w64-mingw32-windres -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_CXX_FLAGS_RELEASE='-O2 -DNDEBUG' \
  "-DCMAKE_SHARED_LINKER_FLAGS=$linkflags" "-DCMAKE_EXE_LINKER_FLAGS=$linkflags" \
  -DZ3_ENABLE_EXAMPLE_TARGETS=OFF -DZ3_INCLUDE_GIT_HASH=OFF -DZ3_INCLUDE_GIT_DESCRIBE=OFF -DZ3_BUILD_LIBZ3_SHARED=ON
cmake --build obj --parallel "$(nproc)" --target libz3 shell
for binary in libz3.dll z3.exe; do
  pattern=$binary
  if [[ "$binary" == libz3.dll ]]; then pattern='*z3.dll'; fi
  mapfile -t found < <(find obj -type f -iname "$pattern")
  [[ ${#found[@]} == 1 ]]
  cp "${found[0]}" "output/$binary"
  imports=$(x86_64-w64-mingw32-objdump -p "output/$binary" | awk '/DLL Name:/ {print tolower($NF)}' | sort -u)
  echo "$binary imports:"
  echo "$imports"
  if grep -Eiq '^(vcruntime|msvcp[0-9]|mfc[0-9]|vcomp[0-9]|libstdc\+\+|libgcc|libwinpthread)' <<< "$imports"; then
    echo 'Unexpected external compiler runtime' >&2
    exit 1
  fi
done
cp z3-solver-4.13.0.0/core/LICENSE.txt output/Z3-LICENSE.txt
cp /usr/share/doc/mingw-w64-common/copyright output/MinGW-COPYRIGHT.txt
cp /usr/share/common-licenses/GPL-3 output/GCC-GPL-3.txt
cp /usr/share/doc/gcc-mingw-w64-base/copyright output/compiler-copyright.txt
cp /usr/share/doc/gcc-13-base/copyright output/GCC-COPYRIGHT.txt
curl --fail --location --retry 3 https://raw.githubusercontent.com/gcc-mirror/gcc/releases/gcc-13.2.0/COPYING.RUNTIME -o output/GCC-RUNTIME-EXCEPTION.txt
grep -q 'GCC RUNTIME LIBRARY EXCEPTION' output/GCC-RUNTIME-EXCEPTION.txt
printf 'source=%s\nsha256=%s\ncompiler=%s\n' "$url" "$sha" "$(x86_64-w64-mingw32-g++-posix -dumpfullversion)" > output/BUILD-INFO.txt
(cd output && sha256sum *.dll *.exe > SHA256SUMS)
