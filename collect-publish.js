#!/usr/bin/env node

/*
收集脚本（不依赖 npm pack）：

进入 packages 目录，逐个读取每个包的 package.json 的 files 字段，
将 files 列表中的“文件或文件夹”复制到根目录的 publish 目录下。

输出结构：
    publish/<包目录名>/<files 中的相对路径>

Usage:
    node collect-publish.js
    node collect-publish.js --out publish
    node collect-publish.js --no-clean
    node collect-publish.js --filter kg-*

Notes:
- 只处理 package.json 中存在且为数组的 files 字段
- 仅按 files 字段复制，不额外包含 README/LICENSE 等
- 这个脚本不会自动 build，如 files 引用了 build 产物请先构建
*/

'use strict';

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

function parseArgs(argv) {
    const args = {
        outDir: 'publish',
        clean: true,
        filter: null
    };

    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];

        if (a === '--out' || a === '-o') {
            args.outDir = argv[++i];
        } else if (a === '--no-clean') {
            args.clean = false;
        } else if (a === '--clean') {
            args.clean = true;
        } else if (a === '--filter') {
            args.filter = argv[++i] || null;
        } else if (a === '--help' || a === '-h') {
            args.help = true;
        } else {
            throw new Error(`Unknown arg: ${a}`);
        }
    }

    return args;
}

function printHelp() {
    // Keep it minimal; this repo avoids overly verbose CLI output.
    // eslint-disable-next-line no-console
    console.log(`collect-publish\n\nCopies files declared in each package.json#files into ./publish.\n\nOptions:\n  -o, --out <dir>          Output directory (default: publish)\n  --[no-]clean             Remove output dir before copying (default: clean)\n  --filter <prefixOrGlob>  Filter package folders (simple glob: * and ?)\n`);
}

function globToRegExp(glob) {
    // Simple glob support for * and ? only.
    const escaped = glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
    return new RegExp(`^${escaped}$`);
}

async function pathExists(p) {
    try {
        await fsp.access(p);
        return true;
    } catch {
        return false;
    }
}

async function ensureDir(p) {
    await fsp.mkdir(p, {recursive: true});
}

async function removeDir(p) {
    await fsp.rm(p, {recursive: true, force: true});
}

function assertSafeRelativePath(relPath) {
    const normalized = relPath.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length === 0) {
        throw new Error('Empty path in package.json#files');
    }
    if (parts.includes('..')) {
        throw new Error(`Invalid path traversal in files entry: ${relPath}`);
    }
    if (path.isAbsolute(relPath)) {
        throw new Error(`Absolute paths are not allowed in files entry: ${relPath}`);
    }
    return parts.join('/');
}

async function copyFile(src, dest) {
    await ensureDir(path.dirname(dest));
    await fsp.copyFile(src, dest);
}

async function copyDirRecursive(srcDir, destDir) {
    await ensureDir(destDir);
    const entries = await fsp.readdir(srcDir, {withFileTypes: true});
    for (const entry of entries) {
        const src = path.join(srcDir, entry.name);
        const dest = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            await copyDirRecursive(src, dest);
        } else if (entry.isFile()) {
            await copyFile(src, dest);
        } else if (entry.isSymbolicLink()) {
            // Resolve symlink to a file/dir; copy target contents
            const real = await fsp.realpath(src);
            const stat = await fsp.stat(real);
            if (stat.isDirectory()) {
                await copyDirRecursive(real, dest);
            } else {
                await copyFile(real, dest);
            }
        }
    }
}

async function getWorkspacePackages(repoRoot) {
    const packagesDir = path.join(repoRoot, 'packages');
    const entries = await fsp.readdir(packagesDir, {withFileTypes: true});

    const dirs = entries
        .filter(e => e.isDirectory())
        .map(e => e.name)
        .sort();

    const result = [];

    for (const dirName of dirs) {
        const pkgDir = path.join(packagesDir, dirName);
        const pkgJsonPath = path.join(pkgDir, 'package.json');
        if (!(await pathExists(pkgJsonPath))) {
            continue;
        }
        const pkgJson = JSON.parse(await fsp.readFile(pkgJsonPath, 'utf8'));
        result.push({
            folderName: dirName,
            dir: pkgDir,
            packageJson: pkgJson
        });
    }

    return result;
}

async function main() {
    const args = parseArgs(process.argv);

    if (args.help) {
        printHelp();
        return;
    }

    const repoRoot = process.cwd();
    const outRoot = path.resolve(repoRoot, args.outDir);

    if (args.clean) {
        await removeDir(outRoot);
    }
    await ensureDir(outRoot);

    const filterRe = args.filter ? globToRegExp(args.filter) : null;

    const packages = await getWorkspacePackages(repoRoot);
    const selected = filterRe ? packages.filter(p => filterRe.test(p.folderName)) : packages;

    if (selected.length === 0) {
        // eslint-disable-next-line no-console
        console.log('No packages matched.');
        return;
    }

    // eslint-disable-next-line no-console
    console.log(`Copying ${selected.length} package(s) into ${path.relative(repoRoot, outRoot)}/ ...`);

    for (const pkg of selected) {
        const filesField = pkg.packageJson && pkg.packageJson.files;
        if (!Array.isArray(filesField) || filesField.length === 0) {
            // eslint-disable-next-line no-console
            console.log(`- ${pkg.folderName}: no package.json#files (or empty), skipping`);
            continue;
        }

        const pkgDir = pkg.dir;
        const outFolder = pkg.folderName;

        const outDir = path.join(outRoot, outFolder);
        await removeDir(outDir);
        await ensureDir(outDir);

        let copiedCount = 0;
        for (const entry of filesField) {
            if (typeof entry !== 'string') {
                continue;
            }

            const relPath = assertSafeRelativePath(entry);

            // 明确不复制 package.json
            if (relPath === 'package.json') {
                continue;
            }

            const src = path.join(pkgDir, relPath);
            const dest = path.join(outDir, relPath);

            if (!(await pathExists(src))) {
                // eslint-disable-next-line no-console
                console.log(`  - ${pkg.folderName}: missing ${relPath}, skipped`);
                continue;
            }

            const stat = await fsp.lstat(src);
            if (stat.isDirectory()) {
                await copyDirRecursive(src, dest);
                copiedCount++;
            } else if (stat.isFile()) {
                await copyFile(src, dest);
                copiedCount++;
            } else if (stat.isSymbolicLink()) {
                const real = await fsp.realpath(src);
                const realStat = await fsp.stat(real);
                if (realStat.isDirectory()) {
                    await copyDirRecursive(real, dest);
                } else {
                    await copyFile(real, dest);
                }
                copiedCount++;
            }
        }

        // eslint-disable-next-line no-console
        console.log(`- ${pkg.folderName} -> ${path.relative(outRoot, outDir)}/ (${copiedCount} entr${copiedCount === 1 ? 'y' : 'ies'})`);
    }

    // eslint-disable-next-line no-console
    console.log('Done.');
}

main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
});
