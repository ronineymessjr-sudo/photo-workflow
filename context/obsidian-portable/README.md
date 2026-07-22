# Portable legacy Obsidian export

The original handoff contained **40 files with non-UTF-8 filenames** that cannot be represented reliably in a cross-platform ZIP.

This directory preserves every affected file byte-for-byte under a portable filename. `manifest.json` records:

- the original relative path as raw hex bytes;
- an escaped display value;
- SHA-256;
- size and MIME type;
- the corresponding portable file.

The original malformed tree is retained in the working source for forensic comparison, but omitted from the distributable ZIP. This archive is historical context and is not used by the V2.5 runtime.
