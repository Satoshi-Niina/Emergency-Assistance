import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText } from 'lucide-react';

interface FileInfo {
  fileName: string;
  exportTimestamp: string | null;
}

interface FileSelectorProps {
  files: FileInfo[];
  value: string | null;
  onChange: (filePath: string) => void;
  label?: string;
}

export const FileSelector: React.FC<FileSelectorProps> = ({ files, value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      // 年月日を表示（例: 2024/10/27）
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}/${month}/${day}`;
    } catch {
      return '';
    }
  };

  const selectedFile = files.find(f => f.fileName === value);
  const displayText = selectedFile 
    ? `${selectedFile.fileName}${selectedFile.exportTimestamp ? ` (${formatTimestamp(selectedFile.exportTimestamp)})` : ''}`
    : 'ファイルを選択...';

  // クリックアウトサイドで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (fileName: string) => {
    onChange(fileName);
    setIsOpen(false);
  };

  return (
    <div className="w-full">
      {label && <label className="block mb-2 text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
        >
          <span className={`truncate ${!value ? 'text-gray-500' : 'text-gray-900'}`}>
            {displayText}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {files && files.length > 0 ? (
              <ul className="py-1">
                {files.map((fileInfo) => {
                  const timestampStr = formatTimestamp(fileInfo.exportTimestamp);
                  const isSelected = fileInfo.fileName === value;
                  return (
                    <li key={fileInfo.fileName}>
                      <button
                        type="button"
                        onClick={() => handleSelect(fileInfo.fileName)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-red-50 hover:text-red-700 ${
                          isSelected ? 'bg-red-100 text-red-700' : 'text-gray-900'
                        }`}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{fileInfo.fileName}</div>
                          {timestampStr && (
                            <div className="text-xs text-gray-500">{timestampStr}</div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                ファイルが見つかりません
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
