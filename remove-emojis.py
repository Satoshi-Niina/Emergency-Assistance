#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re

# Read the file
with open('server/azure-server.mjs', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace emojis with text
emoji_map = {
    '🚀': '[START]',
    '✅': '[OK]',
    '⚠️': '[WARN]',
    '❌': '[ERROR]',
    '📊': '[INFO]',
    '🎯': '[TARGET]',
    '📝': '[NOTE]',
    '🔧': '[CONFIG]',
    '📦': '[PACKAGE]',
    '🔐': '[AUTH]',
    '💾': '[SAVE]',
    '🗑️': '[DELETE]',
    '📁': '[FOLDER]',
    '📄': '[FILE]',
    '🌐': '[WEB]',
    '🔍': '[SEARCH]',
    '📤': '[UPLOAD]',
    '📥': '[DOWNLOAD]',
    '🔄': '[SYNC]',
    '⚡': '[FAST]',
}

for emoji, text in emoji_map.items():
    content = content.replace(emoji, text)

# Write back
with open('server/azure-server.mjs', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print("Emojis removed successfully!")
