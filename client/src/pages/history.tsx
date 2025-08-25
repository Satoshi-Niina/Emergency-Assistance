﻿import React, { useState, useEffect } from 'react';
import { Search, FileText, Image, Calendar, MapPin, Settings, Filter, Download, Trash2, FileDown, FileText as FileTextIcon, Table, Grid3X3, List, ClipboardList, FileSpreadsheet, Grid, Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { SupportHistoryItem, HistorySearchFilters } from '../types/history';
import { 
  fetchHistoryList, 
  fetchMachineData,
  deleteHistory, 
  exportHistoryItem, 
  exportSelectedHistory, 
  exportAllHistory,
  advancedSearch,
  generateReport
} from '../lib/api/history-api';
import ChatExportReport from '../components/report/chat-export-report';



// 逕ｻ蜒上Θ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ
const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL || window.location.origin);

async function fetchDetailFile(name: string) {
  // ID繝吶・繧ｹ縺ｮ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ｒ隧ｦ陦・
  const endpoints = [
    `${API_BASE}/api/history/${name}`,
    `${API_BASE}/api/history/detail/${name}`,
    `${API_BASE}/api/history/file/${name}`
  ];
  
  for (const url of endpoints) {
    try {
      console.log('[fetchDetailFile] 繝ｪ繧ｯ繧ｨ繧ｹ繝磯幕蟋・', url);
      const r = await fetch(url, { credentials: 'include' });
      console.log('[fetchDetailFile] 繝ｬ繧ｹ繝昴Φ繧ｹ蜿嶺ｿ｡:', { status: r.status, ok: r.ok, url });
      
      if (r.ok) {
        const json = await r.json();
        console.log('[fetchDetailFile] JSON隗｣譫仙ｮ御ｺ・', { hasData: !!json, keys: Object.keys(json || {}) });
        return json;
      }
    } catch (error) {
      console.warn('[fetchDetailFile] 繧ｨ繝ｳ繝峨・繧､繝ｳ繝亥､ｱ謨・', url, error);
    }
  }
  
  // 縺吶∋縺ｦ縺ｮ繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′螟ｱ謨励＠縺溷ｴ蜷・
  throw new Error(`detail 404 - ID縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ: ${name}`);
}

function getSelectedItemWithFallback(list: any[], selected: Set<number>) {
  if (selected && selected.size > 0) {
    const idx = [...selected][0];
    return list[idx];
  }
  return list?.[0];
}

interface SearchFilters {
  machineType: string;
  machineNumber: string;
  searchText: string;
  searchDate: string;
}

interface MachineData {
  machineTypes: Array<{ id: string; machineTypeName: string }>;
  machines: Array<{ id: string; machineNumber: string; machineTypeName: string }>;
}

const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<SupportHistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<SupportHistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    machineType: '',
    machineNumber: '',
    searchText: '',
    searchDate: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<SupportHistoryItem | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // 繧ｨ繧ｯ繧ｹ繝昴・繝域ｩ溯・縺ｮ迥ｶ諷・

  const [exportLoading, setExportLoading] = useState(false);
  
  // 繝ｬ繝昴・繝域ｩ溯・縺ｮ迥ｶ諷・
  const [reportLoading, setReportLoading] = useState(false);
  
  // 邱ｨ髮・・繝励Ξ繝薙Η繝ｼ讖溯・縺ｮ迥ｶ諷・
  const [editingItem, setEditingItem] = useState<SupportHistoryItem | null>(null);
  const [previewItem, setPreviewItem] = useState<SupportHistoryItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  
  // 蜊ｰ蛻ｷ讖溯・縺ｮ迥ｶ諷・
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printMode, setPrintMode] = useState<'table' | 'report'>('table');
  
  // 繝ｬ繝昴・繝郁｡ｨ遉ｺ縺ｮ迥ｶ諷・
  const [showReport, setShowReport] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState<any>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  

  


  // 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝槭せ繧ｿ繝ｼ繝・・繧ｿ・育ｷｨ髮・I逕ｨ - PostgreSQL縺九ｉ・・
  const [machineData, setMachineData] = useState<MachineData>({ 
    machineTypes: [], 
    machines: [] 
  });

  // 螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ逕ｨ繝・・繧ｿ・井ｿ晏ｭ倥＆繧後◆JSON繝輔ぃ繧､繝ｫ縺九ｉ・・
  const [searchFilterData, setSearchFilterData] = useState<{
    machineTypes: string[];
    machineNumbers: string[];
  }>({
    machineTypes: [],
    machineNumbers: []
  });

  const [searchFilterLoading, setSearchFilterLoading] = useState(false);

  // JSON繝・・繧ｿ繧呈ｭ｣隕丞喧縺吶ｋ髢｢謨ｰ
  const normalizeJsonData = (item: SupportHistoryItem): SupportHistoryItem => {
    console.log('豁｣隕丞喧蜑阪・繧｢繧､繝・Β:', item);
    
    if (!item.jsonData) {
      console.log('jsonData縺悟ｭ伜惠縺励∪縺帙ｓ');
      return item;
    }

    // 譌｢縺ｫitem逶ｴ謗･縺ｫmachineType縺ｨmachineNumber縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷・
    if (item.machineType && item.machineNumber) {
      console.log('譌｢縺ｫ豁｣隕丞喧貂医∩:', { machineType: item.machineType, machineNumber: item.machineNumber });
      return item;
    }

    // 繧ｵ繝ｼ繝舌・縺九ｉ騾∽ｿ｡縺輔ｌ縺溘ョ繝ｼ繧ｿ繧貞渕縺ｫ豁｣隕丞喧
    const normalizedItem = {
      ...item,
      machineType: item.machineType || item.jsonData.machineType || '',
      machineNumber: item.machineNumber || item.jsonData.machineNumber || '',
      jsonData: {
        ...item.jsonData,
        // 蠢・ｦ√↑繝輔ぅ繝ｼ繝ｫ繝峨ｒ遒ｺ螳溘↓蜷ｫ繧√ｋ
        title: item.jsonData.title || item.title || '',
        problemDescription: item.jsonData.problemDescription || '',
        machineType: item.machineType || item.jsonData.machineType || '',
        machineNumber: item.machineNumber || item.jsonData.machineNumber || '',
        extractedComponents: item.jsonData.extractedComponents || item.extractedComponents || [],
        extractedSymptoms: item.jsonData.extractedSymptoms || item.extractedSymptoms || [],
        possibleModels: item.jsonData.possibleModels || item.possibleModels || [],
        conversationHistory: item.jsonData.conversationHistory || [],
        savedImages: item.jsonData.savedImages || []
      }
    };

    // chatData縺悟ｭ伜惠縺吶ｋ蝣ｴ蜷医・霑ｽ蜉蜃ｦ逅・
    if (item.jsonData.chatData) {
      console.log('chatData蠖｢蠑上ｒ讀懷・');
      const chatData = item.jsonData.chatData;
      
      // machineInfo縺九ｉmachineType縺ｨmachineNumber繧貞叙蠕・
      const machineTypeName = chatData.machineInfo?.machineTypeName || '';
      const machineNumber = chatData.machineInfo?.machineNumber || '';
      
      console.log('chatData縺九ｉ謚ｽ蜃ｺ:', { machineTypeName, machineNumber });

      // chatData縺ｮ蛟､縺ｧ荳頑嶌縺・
      normalizedItem.machineType = machineTypeName || normalizedItem.machineType;
      normalizedItem.machineNumber = machineNumber || normalizedItem.machineNumber;
      normalizedItem.jsonData.machineType = machineTypeName || normalizedItem.jsonData.machineType;
      normalizedItem.jsonData.machineNumber = machineNumber || normalizedItem.jsonData.machineNumber;
    }

    console.log('豁｣隕丞喧蠕後・繧｢繧､繝・Β:', normalizedItem);
    return normalizedItem;
  };

  // 螻･豁ｴ繝・・繧ｿ譖ｴ譁ｰ縺ｮ繝｡繝・そ繝ｼ繧ｸ繝ｪ繧ｹ繝翫・
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_HISTORY_ITEM') {
        const updatedData = event.data.data;
        console.log('螻･豁ｴ繝・・繧ｿ譖ｴ譁ｰ繝｡繝・そ繝ｼ繧ｸ繧貞女菫｡:', updatedData);
        
        // 螻･豁ｴ荳隕ｧ陦ｨ縺ｮ隧ｲ蠖薙い繧､繝・Β繧呈峩譁ｰ
        setHistoryItems(prevItems => 
          prevItems.map(item => 
            item.id === updatedData.id || item.chatId === updatedData.chatId 
              ? { ...item, ...updatedData }
              : item
          )
        );
        
        // 繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ縺輔ｌ縺溘い繧､繝・Β繧よ峩譁ｰ
        setFilteredItems(prevItems => 
          prevItems.map(item => 
            item.id === updatedData.id || item.chatId === updatedData.chatId 
              ? { ...item, ...updatedData }
              : item
          )
        );
        
        // 驕ｸ謚樔ｸｭ縺ｮ繧｢繧､繝・Β繧よ峩譁ｰ
        if (selectedItem && (selectedItem.id === updatedData.id || selectedItem.chatId === updatedData.chatId)) {
          setSelectedItem(prev => prev ? { ...prev, ...updatedData } : null);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedItem]);
  const [machineDataLoading, setMachineDataLoading] = useState(false);

  // machineData縺ｮ迥ｶ諷句､牙喧繧堤屮隕・
  useEffect(() => {
    console.log('剥 machineData迥ｶ諷句､牙喧:', machineData);
  }, [machineData]);

  // 繝・・繧ｿ蜿門ｾ暦ｼ医し繝ｼ繝舌・API縺九ｉ蜿門ｾ暦ｼ・
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('剥 繝・・繧ｿ蛻晄悄蛹夜幕蟋・);
        setLoading(true);
        await Promise.all([
          fetchHistoryData().catch(error => {
            console.error('螻･豁ｴ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
          }),
          fetchMachineDataFromAPI().catch(error => {
            console.error('讖溽ｨｮ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
          })
        ]);
        console.log('剥 繝・・繧ｿ蛻晄悄蛹門ｮ御ｺ・);
      } catch (error) {
        console.error('繝・・繧ｿ蛻晄悄蛹悶お繝ｩ繝ｼ:', error);
      } finally {
        setLoading(false);
      }
    };

    console.log('剥 useEffect螳溯｡・);
    initializeData();
  }, []);

  // 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝槭せ繧ｿ繝ｼ繝・・繧ｿ蜿門ｾ・
  const fetchMachineDataFromAPI = async () => {
    try {
      setMachineDataLoading(true);
      
      // 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ繧貞ｰら畑API縺九ｉ蜿門ｾ・
      console.log('剥 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ蜿門ｾ鈴幕蟋・);
      const response = await fetch('/api/history/machine-data');
      console.log('剥 API繝ｬ繧ｹ繝昴Φ繧ｹ:', response.status, response.statusText);
      const data = await response.json();
      console.log('剥 API繝ｬ繧ｹ繝昴Φ繧ｹ繝・・繧ｿ:', data);
      
      if (data.success && data.machineTypes && data.machines) {
        // 讖溽ｨｮ荳隕ｧ繧呈ｧ狗ｯ会ｼ磯㍾隍・勁蜴ｻ・・
        const machineTypeSet = new Set<string>();
        const machineTypes: Array<{ id: string; machineTypeName: string }> = [];
        
        // 讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ繧呈ｧ狗ｯ会ｼ磯㍾隍・勁蜴ｻ・・
        const machineSet = new Set<string>();
        const machines: Array<{ id: string; machineNumber: string; machineTypeName: string }> = [];
        
        console.log('剥 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺ｯ蟆ら畑API縺九ｉ蜿門ｾ励＆繧後∪縺・);
        
        const result = {
          machineTypes: data.machineTypes || [],
          machines: data.machines || []
        };
        
        console.log('剥 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ蜿門ｾ礼ｵ先棡:', result);
        console.log('剥 讖溽ｨｮ謨ｰ:', result.machineTypes.length);
        console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ謨ｰ:', result.machines.length);
        console.log('剥 讖溽ｨｮ荳隕ｧ:', result.machineTypes.map(t => t.machineTypeName));
        console.log('剥 讖滓｢ｰ逡ｪ蜿ｷ荳隕ｧ:', result.machines.map(m => `${m.machineNumber} (${m.machineTypeName})`));
        console.log('剥 setMachineData蜻ｼ縺ｳ蜃ｺ縺怜燕:', result);
        setMachineData(result);
        console.log('剥 setMachineData蜻ｼ縺ｳ蜃ｺ縺怜ｮ御ｺ・);
      } else {
        console.log('笞・・讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺梧ｭ｣縺励￥蜿門ｾ励〒縺阪∪縺帙ｓ縺ｧ縺励◆:', data);
        console.log('笞・・data.success:', data.success);
        console.log('笞・・data.machineTypes:', data.machineTypes);
        console.log('笞・・data.machines:', data.machines);
        setMachineData({ machineTypes: [], machines: [] });
      }
    } catch (error) {
      console.error('讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:', error);
      setMachineData({ machineTypes: [], machines: [] });
    } finally {
      setMachineDataLoading(false);
    }
  };

  // 螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ逕ｨ繝・・繧ｿ・井ｿ晏ｭ倥＆繧後◆JSON繝輔ぃ繧､繝ｫ縺九ｉ蜿門ｾ暦ｼ・
  const fetchSearchFilterData = async () => {
    try {
      setSearchFilterLoading(true);
      console.log('剥 螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ蜿門ｾ鈴幕蟋・);
      
      const response = await fetch('/api/history/search-filters');
      const result = await response.json();
      
      if (result.success) {
        setSearchFilterData({
          machineTypes: result.machineTypes || [],
          machineNumbers: result.machineNumbers || []
        });
        console.log('剥 螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ蜿門ｾ怜ｮ御ｺ・', {
          machineTypes: result.machineTypes?.length || 0,
          machineNumbers: result.machineNumbers?.length || 0
        });
      } else {
        console.error('螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ蜿門ｾ怜､ｱ謨・', result.error);
      }
    } catch (error) {
      console.error('螻･豁ｴ讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ蜿門ｾ励お繝ｩ繝ｼ:', error);
    } finally {
      setSearchFilterLoading(false);
    }
  };

  const fetchHistoryData = async (page: number = 1) => {
    try {
      setLoading(true);
      
      // 繧ｵ繝ｼ繝舌・蛛ｴ縺ｧ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ繧定｡後≧
      const params = new URLSearchParams();
      if (filters.machineType) params.append('machineType', filters.machineType);
      if (filters.machineNumber) params.append('machineNumber', filters.machineNumber);
      if (filters.searchText) params.append('searchText', filters.searchText);
      if (filters.searchDate) params.append('searchDate', filters.searchDate);
      params.append('limit', '20');
      params.append('offset', ((page - 1) * 20).toString());
      
      const response = await fetch(`/api/history?${params.toString()}`);
      const data = await response.json();
      
      console.log('剥 蜿門ｾ励＠縺溘ョ繝ｼ繧ｿ:', data);
      
      if (data.success && data.items) {
        console.log('剥 蜿門ｾ嶺ｻｶ謨ｰ:', data.items.length);
        
        // 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺ｮ遒ｺ隱・
        data.items.forEach((item: any, index: number) => {
          console.log(`剥 繧｢繧､繝・Β ${index + 1}:`, {
            fileName: item.fileName,
            machineType: item.machineType,
            machineNumber: item.machineNumber,
            machineInfo: item.machineInfo
          });
        });
        
        // 繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺九ｉ菫晏ｭ倥＆繧後◆繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ繧薙〒螻･豁ｴ繝・・繧ｿ繧呈峩譁ｰ
        const updatedItems = data.items.map((item: any) => {
          const savedKey = 'savedMachineFailureReport_' + (item.id || item.chatId);
          const savedData = localStorage.getItem(savedKey);
          let processedItem = item;
          
          if (savedData) {
            try {
              const parsedData = JSON.parse(savedData);
              console.log('繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺九ｉ菫晏ｭ倥＆繧後◆繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ:', parsedData);
              processedItem = { ...item, ...parsedData };
            } catch (parseError) {
              console.warn('菫晏ｭ倥＆繧後◆繝・・繧ｿ縺ｮ隗｣譫舌↓螟ｱ謨・', parseError);
            }
          }
          
          // SupportHistoryItem蝙九↓螟画鋤
          const convertedItem: SupportHistoryItem = {
            id: processedItem.id,
            chatId: processedItem.chatId,
            fileName: processedItem.fileName,
            machineType: processedItem.machineType || '',
            machineNumber: processedItem.machineNumber || '',
            title: processedItem.title,
            createdAt: processedItem.createdAt || processedItem.exportTimestamp || new Date().toISOString(),
            lastModified: processedItem.lastModified,
            extractedComponents: processedItem.extractedComponents,
            extractedSymptoms: processedItem.extractedSymptoms,
            possibleModels: processedItem.possibleModels,
            machineInfo: processedItem.machineInfo,
            jsonData: {
              ...processedItem, // 蜈ｨ縺ｦ縺ｮ蜈・ョ繝ｼ繧ｿ繧貞性繧√ｋ
              machineType: processedItem.machineType || '',
              machineNumber: processedItem.machineNumber || '',
              title: processedItem.title,
              problemDescription: processedItem.problemDescription,
              extractedComponents: processedItem.extractedComponents,
              extractedSymptoms: processedItem.extractedSymptoms,
              possibleModels: processedItem.possibleModels,
              conversationHistory: processedItem.conversationHistory,
              chatData: processedItem.chatData,
              savedImages: processedItem.savedImages,
              metadata: processedItem.metadata
            }
          };
          
          console.log('螟画鋤縺輔ｌ縺溘い繧､繝・Β:', {
            fileName: convertedItem.fileName,
            machineType: convertedItem.machineType,
            machineNumber: convertedItem.machineNumber,
            jsonData: convertedItem.jsonData
          });
          
          return convertedItem;
        });
        
        setHistoryItems(updatedItems);
        setFilteredItems(updatedItems);
        setTotalPages(Math.ceil(data.total / 20));
        setCurrentPage(page);
      } else {
        console.log('剥 繝・・繧ｿ蜿門ｾ玲・蜉溘○縺・', data);
        setHistoryItems([]);
        setFilteredItems([]);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('螻･豁ｴ繝・・繧ｿ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆:', error);
      setHistoryItems([]);
      setFilteredItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // 讀懃ｴ｢縺ｨ繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ
  useEffect(() => {
    // 蛻晄悄繝ｭ繝ｼ繝画凾縺ｮ縺ｿ螳溯｡・
    if (currentPage === 1 && historyItems.length === 0) {
      fetchHistoryData(1);
      fetchSearchFilterData(); // 螻･豁ｴ讀懃ｴ｢逕ｨ繝輔ぅ繝ｫ繧ｿ繝ｼ繝・・繧ｿ繧貞叙蠕・
    }
  }, []); // filters縺ｮ萓晏ｭ倥ｒ蜑企勁

  // 繝輔ぅ繝ｫ繧ｿ繝ｼ螟画峩譎ゅ・蜃ｦ逅・
  const handleFilterChange = (key: keyof SearchFilters, value: string) => {
    // filters 繧呈峩譁ｰ
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));

    // 邱ｨ髮・ム繧､繧｢繝ｭ繧ｰ縺碁幕縺・※縺・ｋ蝣ｴ蜷医・縲∫ｷｨ髮・ｸｭ縺ｮ繧｢繧､繝・Β縺ｫ繧ょ渚譏縺吶ｋ
    // 譛溷ｾ・＆繧後ｋ蜍穂ｽ・ 繝輔ぅ繝ｫ繧ｿ縺ｧ讖溽ｨｮ/讖滓｢ｰ逡ｪ蜿ｷ繧帝∈謚槭☆繧九→縲√☆縺ｧ縺ｫ邱ｨ髮・ｸｭ縺ｮ繝輔か繝ｼ繝縺ｫ蜊ｳ蠎ｧ縺ｫ蜿肴丐縺輔ｌ繧・
    try {
      if (editingItem) {
        if (key === 'machineType' || key === 'machineNumber') {
          setEditingItem(prev => prev ? { ...prev, [key]: value } as SupportHistoryItem : prev);
          console.log(`filters -> editingItem sync: ${key} = ${value}`);
        }
      }
    } catch (syncError) {
      console.warn('繝輔ぅ繝ｫ繧ｿ繝ｼ縺九ｉ邱ｨ髮・い繧､繝・Β縺ｸ縺ｮ蜷梧悄縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', syncError);
    }
  };

  const handleSearch = () => {
    fetchHistoryData(1);
  };

  const handlePageChange = (page: number) => {
    fetchHistoryData(page);
  };

  const handleDeleteHistory = async (id: string) => {
    if (window.confirm('縺薙・螻･豁ｴ繧貞炎髯､縺励∪縺吶°・・)) {
      try {
        await deleteHistory(id);
        fetchHistoryData(currentPage);
      } catch (error) {
        console.error('螻･豁ｴ蜑企勁繧ｨ繝ｩ繝ｼ:', error);
      }
    }
  };

  // 驕ｸ謚槭メ繧ｧ繝・け讖溯・
  const handleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleExportSelected = async (format: 'json' | 'csv' = 'json') => {
    if (selectedItems.size === 0) {
      alert('繧ｨ繧ｯ繧ｹ繝昴・繝医☆繧句ｱ･豁ｴ繧帝∈謚槭＠縺ｦ縺上□縺輔＞縲・);
      return;
    }

    try {
      setExportLoading(true);
      const selectedItemsArray = filteredItems.filter(item => selectedItems.has(item.id));
      const blob = await exportSelectedHistory(selectedItemsArray, format);
      downloadFile(blob, `selected_history.${format}`);
    } catch (error) {
      console.error('驕ｸ謚槫ｱ･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = async (item: SupportHistoryItem) => {
    try {
      const blob = await exportHistoryItem(item.id, 'json');
      downloadFile(blob, `history_${item.id}.json`);
    } catch (error) {
      console.error('繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    }
  };






  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };


  const handleExportItem = async (item: SupportHistoryItem, format: 'json' | 'csv' = 'json') => {
    try {
      setExportLoading(true);
      const blob = await exportHistoryItem(item.id, format);
      downloadFile(blob, `history_${item.id}.${format}`);
    } catch (error) {
      console.error('繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    } finally {
      setExportLoading(false);
    }
  };



  const handleExportAll = async (format: 'json' | 'csv' = 'json') => {
    try {
      setExportLoading(true);
      const blob = await exportAllHistory(filters, format);
      downloadFile(blob, `all_history.${format}`);
    } catch (error) {
      console.error('繧ｨ繧ｯ繧ｹ繝昴・繝医お繝ｩ繝ｼ:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      machineType: '',
      machineNumber: '',
      searchText: '',
      searchDate: ''
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const handleGenerateReport = async () => {
    // 譌｢縺ｫ繝ｬ繝昴・繝育函謌蝉ｸｭ縺ｮ蝣ｴ蜷医・蜃ｦ逅・ｒ蛛懈ｭ｢
    if (reportLoading) {
      console.log('繝ｬ繝昴・繝育函謌蝉ｸｭ縺ｧ縺吶ょ・逅・ｒ蛛懈ｭ｢縺励∪縺吶・);
      return;
    }

    try {
      console.log('=== 繝ｬ繝昴・繝育函謌宣幕蟋・===');
      setReportLoading(true);
      
      // 驕ｸ謚槭＆繧後◆繧｢繧､繝・Β縺ｮ縺ｿ繧貞ｯｾ雎｡縺ｨ縺吶ｋ
      // 蜈ｨ莉ｶ繧貞ｯｾ雎｡縺ｨ縺吶ｋ
      const targetItems = filteredItems;
      
      console.log('繝ｬ繝昴・繝育函謌宣幕蟋・', { 
        filteredItemsCount: filteredItems.length,
        targetItemsCount: targetItems.length
      });
      
      // 蟇ｾ雎｡繧｢繧､繝・Β縺後↑縺・ｴ蜷医・蜃ｦ逅・ｒ蛛懈ｭ｢
      if (targetItems.length === 0) {
        alert('蟇ｾ雎｡繧｢繧､繝・Β縺後≠繧翫∪縺帙ｓ縲・);
        setReportLoading(false);
        return;
      }
      
      // 蜷・い繧､繝・Β縺ｮ繝・・繧ｿ讒矩繧堤｢ｺ隱・
      targetItems.forEach((item, index) => {
        console.log(`繧｢繧､繝・Β${index + 1}縺ｮ繝・・繧ｿ讒矩:`, {
          id: item.id,
          fileName: item.fileName,
          hasJsonData: !!item.jsonData,
          jsonDataKeys: item.jsonData ? Object.keys(item.jsonData) : [],
          machineInfo: item.machineInfo,
          machineType: item.machineType,
          machineNumber: item.machineNumber
        });
      });
      
      // 驕ｸ謚槭＆繧後◆繧｢繧､繝・Β縺九ｉJSON繝・・繧ｿ繧貞・譫舌＠縺ｦ繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧堤函謌・
      const allTitles: string[] = [];
      const allComponents: string[] = [];
      const allSymptoms: string[] = [];
      const allModels: string[] = [];
      
      targetItems.forEach(item => {
        const jsonData = item?.jsonData ?? item?.data ?? {};
        
        // 莠玖ｱ｡繧ｿ繧､繝医Ν繧呈歓蜃ｺ・医ヵ繧｡繧､繝ｫ蜷阪°繧牙━蜈育噪縺ｫ蜿門ｾ励∵ｬ｡縺ｫJSON繝・・繧ｿ縺九ｉ・・
        let title = null;
        
        // 縺ｾ縺壹ヵ繧｡繧､繝ｫ蜷阪°繧我ｺ玖ｱ｡蜀・ｮｹ繧呈歓蜃ｺ
        if (item.fileName) {
          const fileNameParts = item.fileName.split('_');
          if (fileNameParts.length > 1) {
            title = fileNameParts[0];
          }
        }
        
        // 繝輔ぃ繧､繝ｫ蜷阪°繧牙叙蠕励〒縺阪↑縺・ｴ蜷医・縲゛SON繝・・繧ｿ縺九ｉ蜿門ｾ・
        if (!title) {
          title = jsonData?.title;
          if (!title && jsonData?.chatData?.messages) {
            // 蠕捺擂繝輔か繝ｼ繝槭ャ繝医・蝣ｴ蜷医√Θ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺九ｉ莠玖ｱ｡繧呈歓蜃ｺ
            const userMessages = jsonData?.chatData?.messages?.filter((msg: any) => !msg.isAiResponse);
            if (userMessages?.length > 0) {
              title = userMessages[0]?.content;
            }
          }
        }
        
        if (title) allTitles.push(title);
        
        if (jsonData?.extractedComponents) allComponents.push(...jsonData.extractedComponents);
        if (jsonData?.extractedSymptoms) allSymptoms.push(...jsonData.extractedSymptoms);
        if (jsonData?.possibleModels) allModels.push(...jsonData.possibleModels);
      });
      
      console.log('謚ｽ蜃ｺ縺輔ｌ縺溘ョ繝ｼ繧ｿ:', {
        titles: allTitles,
        components: allComponents,
        symptoms: allSymptoms,
        models: allModels
      });
      
      // 蜷・い繧､繝・Β縺斐→縺ｫ蛟句挨縺ｮ繝ｬ繝昴・繝医ｒ逕滓・
      const reportDataArray = targetItems.map((item, index) => {
        console.log(`繝ｬ繝昴・繝・{index + 1}縺ｮ逕滓・髢句ｧ・`, item.fileName);
        
        const jsonData = item?.jsonData ?? item?.data ?? {};
        
        // 莠玖ｱ｡繧ｿ繧､繝医Ν繧呈歓蜃ｺ・医ヵ繧｡繧､繝ｫ蜷阪°繧牙━蜈育噪縺ｫ蜿門ｾ励∵ｬ｡縺ｫJSON繝・・繧ｿ縺九ｉ・・
        let title = '莠玖ｱ｡縺ｪ縺・;
        
        // 縺ｾ縺壹ヵ繧｡繧､繝ｫ蜷阪°繧我ｺ玖ｱ｡蜀・ｮｹ繧呈歓蜃ｺ
        if (item.fileName) {
          const fileNameParts = item.fileName.split('_');
          if (fileNameParts.length > 1) {
            title = fileNameParts[0];
          }
        }
        
        // 繝輔ぃ繧､繝ｫ蜷阪°繧牙叙蠕励〒縺阪↑縺・ｴ蜷医・縲゛SON繝・・繧ｿ縺九ｉ蜿門ｾ・
        if (title === '莠玖ｱ｡縺ｪ縺・) {
          title = jsonData?.title;
          if (!title && jsonData?.chatData?.messages) {
            // 蠕捺擂繝輔か繝ｼ繝槭ャ繝医・蝣ｴ蜷医√Θ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺九ｉ莠玖ｱ｡繧呈歓蜃ｺ
            const userMessages = jsonData?.chatData?.messages?.filter((msg: any) => !msg.isAiResponse);
            if (userMessages?.length > 0) {
              title = userMessages[0]?.content;
            }
          }
        }
        
        // 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ繧呈歓蜃ｺ
        const machineType = item.machineInfo?.machineTypeName || 
                          jsonData?.machineType || 
                          jsonData?.chatData?.machineInfo?.machineTypeName || 
                          item.machineType || '';
        const machineNumber = item.machineInfo?.machineNumber || 
                            jsonData?.machineNumber || 
                            jsonData?.chatData?.machineInfo?.machineNumber || 
                            item.machineNumber || '';
        
        console.log(`繝ｬ繝昴・繝・{index + 1}縺ｮ蝓ｺ譛ｬ諠・ｱ:`, {
          title,
          machineType,
          machineNumber
        });
        
        // 逕ｻ蜒上ョ繝ｼ繧ｿ繧貞庶髮・ｼ亥━蜈磯・ｽ堺ｻ倥″・・
        const images = [];
        
        try {
          // 蜆ｪ蜈磯・ｽ・: conversationHistory縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ暦ｼ域怙蜆ｪ蜈茨ｼ・
          if (jsonData?.conversationHistory?.length > 0) {
            console.log('handleGenerateReport: conversationHistory縺九ｉBase64逕ｻ蜒上ｒ讀懃ｴ｢荳ｭ...', jsonData.conversationHistory.length);
            const imageMessages = jsonData.conversationHistory.filter((msg: any) => 
              msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')
            );
            console.log('handleGenerateReport: conversationHistory縺ｧBase64逕ｻ蜒上ｒ逋ｺ隕・', imageMessages.length);
            imageMessages.forEach((msg, index) => {
              images.push({
                id: `conv-${index}`,
                url: msg.content,
                fileName: `謨・囿逕ｻ蜒柔${index + 1}`,
                description: '讖滓｢ｰ謨・囿邂・園縺ｮ蜀咏悄',
                source: 'conversationHistory'
              });
            });
          }
          
          // 蜆ｪ蜈磯・ｽ・: originalChatData.messages縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ・
          if (jsonData?.originalChatData?.messages?.length > 0) {
            console.log('handleGenerateReport: originalChatData.messages縺九ｉBase64逕ｻ蜒上ｒ讀懃ｴ｢荳ｭ...', jsonData.originalChatData.messages.length);
            const imageMessages = jsonData.originalChatData.messages.filter((msg: any) => 
              msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')
            );
            console.log('handleGenerateReport: originalChatData.messages縺ｧBase64逕ｻ蜒上ｒ逋ｺ隕・', imageMessages.length);
            imageMessages.forEach((msg, index) => {
              // 譌｢縺ｫ霑ｽ蜉貂医∩縺ｮ逕ｻ蜒上・髯､螟・
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `orig-${index}`,
                  url: msg.content,
                  fileName: `謨・囿逕ｻ蜒柔${images.length + 1}`,
                  description: '讖滓｢ｰ謨・囿邂・園縺ｮ蜀咏悄',
                  source: 'originalChatData'
                });
              }
            });
          }
          
          // 蜆ｪ蜈磯・ｽ・: chatData.messages縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ・
          if (jsonData?.chatData?.messages?.length > 0) {
            console.log('handleGenerateReport: chatData.messages縺九ｉBase64逕ｻ蜒上ｒ讀懃ｴ｢荳ｭ...', jsonData.chatData.messages.length);
            const imageMessages = jsonData.chatData.messages.filter((msg: any) => 
              msg.content && typeof msg.content === 'string' && msg.content.startsWith('data:image/')
            );
            console.log('handleGenerateReport: chatData.messages縺ｧBase64逕ｻ蜒上ｒ逋ｺ隕・', imageMessages.length);
            imageMessages.forEach((msg, index) => {
              // 譌｢縺ｫ霑ｽ蜉貂医∩縺ｮ逕ｻ蜒上・髯､螟・
              if (!images.some(img => img.url === msg.content)) {
                images.push({
                  id: `chat-${index}`,
                  url: msg.content,
                  fileName: `謨・囿逕ｻ蜒柔${images.length + 1}`,
                  description: '讖滓｢ｰ謨・囿邂・園縺ｮ蜀咏悄',
                  source: 'chatData'
                });
              }
            });
          }
          
          // 蜆ｪ蜈磯・ｽ・: savedImages繝輔ぅ繝ｼ繝ｫ繝峨°繧臥判蜒上ｒ蜿門ｾ・
          if (jsonData?.savedImages?.length > 0) {
            console.log('handleGenerateReport: savedImages縺九ｉ逕ｻ蜒上ｒ蜿門ｾ嶺ｸｭ...', jsonData.savedImages.length);
            jsonData.savedImages.forEach((img: any, index: number) => {
              // 譌｢縺ｫ霑ｽ蜉貂医∩縺ｮ逕ｻ蜒上・髯､螟・
              if (!images.some(existingImg => existingImg.url === img.url || existingImg.url === img.path)) {
                images.push({
                  id: `saved-${index}`,
                  url: img.url || img.path,
                  fileName: img.fileName || `謨・囿逕ｻ蜒柔${images.length + 1}`,
                  description: img.description || '讖滓｢ｰ謨・囿邂・園縺ｮ蜀咏悄',
                  source: 'savedImages'
                });
              }
            });
          }
          
          // 蜆ｪ蜈磯・ｽ・: 蜀榊ｸｰ逧・↓JSON繝・・繧ｿ蜀・・逕ｻ蜒上ｒ讀懃ｴ｢
          const findImagesRecursively = (obj: any, path: string = ''): string[] => {
            const foundImages: string[] = [];
            
            if (obj && typeof obj === 'object') {
              Object.entries(obj).forEach(([key, value]) => {
                const currentPath = path ? `${path}.${key}` : key;
                
                if (typeof value === 'string' && value.startsWith('data:image/')) {
                  foundImages.push(value);
                } else if (Array.isArray(value)) {
                  value.forEach((item, index) => {
                    foundImages.push(...findImagesRecursively(item, `${currentPath}[${index}]`));
                  });
                } else if (typeof value === 'object' && value !== null) {
                  foundImages.push(...findImagesRecursively(value, currentPath));
                }
              });
            }
            
            return foundImages;
          };
          
          const recursiveImages = findImagesRecursively(jsonData);
          console.log('handleGenerateReport: 蜀榊ｸｰ讀懃ｴ｢縺ｧ逕ｻ蜒上ｒ逋ｺ隕・', recursiveImages.length);
          recursiveImages.forEach((imgUrl, index) => {
            // 譌｢縺ｫ霑ｽ蜉貂医∩縺ｮ逕ｻ蜒上・髯､螟・
            if (!images.some(img => img.url === imgUrl)) {
              images.push({
                id: `recursive-${index}`,
                url: imgUrl,
                fileName: `謨・囿逕ｻ蜒柔${images.length + 1}`,
                description: '讖滓｢ｰ謨・囿邂・園縺ｮ蜀咏悄',
                source: 'recursive'
              });
            }
          });
          
          // 蜆ｪ蜈磯・ｽ・: imagePath繝輔ぅ繝ｼ繝ｫ繝会ｼ域怙邨ゅヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ・・
          if (jsonData?.imagePath && typeof jsonData.imagePath === 'string' && !images.some(img => img.url === jsonData.imagePath)) {
            console.log('handleGenerateReport: imagePath縺九ｉ逕ｻ蜒上ｒ蜿門ｾ嶺ｸｭ...');
            images.push({
              id: 'imagePath',
              url: jsonData.imagePath,
              fileName: '謨・囿逕ｻ蜒・,
              description: '讖滓｢ｰ謨・囿邂・園縺ｮ蜀咏悄',
              source: 'imagePath'
            });
          }
        } catch (imageError) {
          console.error('逕ｻ蜒上ョ繝ｼ繧ｿ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', imageError);
          // 逕ｻ蜒丞・逅・お繝ｩ繝ｼ縺檎匱逕溘＠縺ｦ繧ゅΞ繝昴・繝育函謌舌・邯夊｡・
        }
        
        console.log(`繝ｬ繝昴・繝・{index + 1}縺ｮ逕ｻ蜒乗焚:`, images.length, '譫・);
        
        const reportData = {
          reportId: `R${Date.now().toString().slice(-5)}-${index + 1}`,
          machineId: machineNumber || '荳肴・',
          date: new Date(item.createdAt).toISOString().split('T')[0],
          location: '笳銀雷邱・,
          failureCode: 'FC01',
          description: title,
          status: '蝣ｱ蜻雁ｮ御ｺ・,
          engineer: '繧ｷ繧ｹ繝・Β邂｡逅・・,
          notes: `莠玖ｱ｡繧ｿ繧､繝医Ν: ${title}\n讖溽ｨｮ: ${machineType}\n讖滓｢ｰ逡ｪ蜿ｷ: ${machineNumber}\n菴懈・譌･譎・ ${new Date(item.createdAt).toLocaleString('ja-JP')}\n蠖ｱ髻ｿ繧ｳ繝ｳ繝昴・繝阪Φ繝・ ${jsonData?.extractedComponents?.join(', ') || '縺ｪ縺・}\n逞・憾: ${jsonData?.extractedSymptoms?.join(', ') || '縺ｪ縺・}\n蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ讖溽ｨｮ: ${jsonData?.possibleModels?.join(', ') || '縺ｪ縺・}`,
          repairRequestDate: new Date().toISOString().split('T')[0],
          repairSchedule: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          repairLocation: '蟾･蝣ｴ蜀・ｿｮ逅・せ繝壹・繧ｹ',
          images: images.length > 0 ? images : undefined,
          chatHistory: jsonData?.conversationHistory || jsonData?.chatData?.messages || undefined
        };
        
        console.log(`繝ｬ繝昴・繝・{index + 1}縺ｮ逕滓・螳御ｺ・`, {
          reportId: reportData.reportId,
          description: reportData.description,
          images: reportData.images?.length || 0
        });
        
        return reportData;
      });
      
      console.log('=== 繝ｬ繝昴・繝医ョ繝ｼ繧ｿ逕滓・螳御ｺ・===');
      console.log('繝ｬ繝昴・繝磯・蛻励・髟ｷ縺・', reportDataArray.length);
      console.log('蜷・Ξ繝昴・繝医・隧ｳ邏ｰ:', reportDataArray.map((report, index) => ({
        index,
        reportId: report.reportId,
        description: report.description,
        images: report.images?.map(img => ({
          url: img.url.substring(0, 50) + (img.url.length > 50 ? '...' : ''),
          fileName: img.fileName,
          isBase64: img.url.startsWith('data:image/')
        }))
      })));
      
      setMachineFailureReportData(reportDataArray);
      setShowMachineFailureReport(true);
      console.log('繝ｬ繝昴・繝郁｡ｨ遉ｺ迥ｶ諷九ｒ險ｭ螳壼ｮ御ｺ・);
      
      // 謌仙粥騾夂衍
      alert(`繝ｬ繝昴・繝医′豁｣蟶ｸ縺ｫ逕滓・縺輔ｌ縺ｾ縺励◆縲・n蟇ｾ雎｡繧｢繧､繝・Β: ${targetItems.length}莉ｶ (驕ｸ謚樊ｸ医∩)\n${targetItems.length > 1 ? '隍・焚繝壹・繧ｸ縺ｧ陦ｨ遉ｺ縺輔ｌ縺ｾ縺吶・ : ''}`);
      
      console.log('=== 繝ｬ繝昴・繝育函謌仙ｮ御ｺ・===');
    } catch (error) {
      console.error('=== 繝ｬ繝昴・繝育函謌舌お繝ｩ繝ｼ ===');
      console.error('繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ:', error);
      console.error('繧ｨ繝ｩ繝ｼ繧ｹ繧ｿ繝・け:', error instanceof Error ? error.stack : '繧ｹ繧ｿ繝・け繝医Ξ繝ｼ繧ｹ縺ｪ縺・);
      alert('繝ｬ繝昴・繝育函謌蝉ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｦ繧ら｢ｺ螳溘↓繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ迥ｶ諷九ｒ繝ｪ繧ｻ繝・ヨ
      setReportLoading(false);
      console.log('繝ｬ繝昴・繝育函謌千憾諷九ｒ繝ｪ繧ｻ繝・ヨ螳御ｺ・);
    }
  };



  const handleShowReport = async (fileName: string) => {
    try {
      const response = await fetch(`/api/history/file?name=${encodeURIComponent(fileName)}`);
      if (!response.ok) {
        throw new Error('繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
      }
      
      const data = await response.json();
      
      // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医・繝・・繧ｿ繧堤｢ｺ隱阪＠縺ｦ縲・←蛻・↑蠖｢蠑上↓螟画鋤
      const reportData = {
        ...data,
        // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医・繝輔ぅ繝ｼ繝ｫ繝峨ｒ霑ｽ蜉
        title: data.title || data.chatData?.machineInfo?.machineTypeName || '繧ｿ繧､繝医Ν縺ｪ縺・,
        problemDescription: data.problemDescription || '隱ｬ譏弱↑縺・,
        machineType: data.machineType || data.chatData?.machineInfo?.machineTypeName || '',
        machineNumber: data.machineNumber || data.chatData?.machineInfo?.machineNumber || '',
        extractedComponents: data.extractedComponents || [],
        extractedSymptoms: data.extractedSymptoms || [],
        possibleModels: data.possibleModels || [],
        conversationHistory: data.conversationHistory || data.chatData?.messages || [],
        metadata: data.metadata || {
          total_messages: data.chatData?.messages?.length || 0,
          user_messages: 0,
          ai_messages: 0,
          total_media: data.savedImages?.length || 0,
          export_format_version: "1.0"
        }
      };
      
      setSelectedReportData(reportData);
      setSelectedFileName(fileName);
      setShowReport(true);
    } catch (error) {
      console.error('繝ｬ繝昴・繝郁｡ｨ遉ｺ繧ｨ繝ｩ繝ｼ:', error);
    }
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setSelectedReportData(null);
    setSelectedFileName('');
    // 繝ｬ繝昴・繝育函謌舌・迥ｶ諷九ｂ繝ｪ繧ｻ繝・ヨ
    setReportLoading(false);
  };

  const handleSaveReport = (reportData: any) => {
    console.log('繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧剃ｿ晏ｭ・', reportData);
    
    // 繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧偵Ο繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｫ菫晏ｭ・
    const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    const newReport = {
      id: Date.now(),
      fileName: selectedFileName,
      reportData: reportData,
      savedAt: new Date().toISOString()
    };
    savedReports.push(newReport);
    localStorage.setItem('savedReports', JSON.stringify(savedReports));
    
    console.log('繝ｬ繝昴・繝医′菫晏ｭ倥＆繧後∪縺励◆:', newReport);
  };

  // 螻･豁ｴ繧｢繧､繝・Β縺ｮ邱ｨ髮・ョ繝ｼ繧ｿ繧偵し繝ｼ繝舌・縺ｫ菫晏ｭ・
  const handleSaveEditedItem = async (editedItem: SupportHistoryItem) => {
    try {
      console.log('邱ｨ髮・＆繧後◆螻･豁ｴ繧｢繧､繝・Β繧剃ｿ晏ｭ・', editedItem);
      console.log('邱ｨ髮・＆繧後◆螻･豁ｴ繧｢繧､繝・Β縺ｮID:', editedItem.id);
      console.log('邱ｨ髮・＆繧後◆螻･豁ｴ繧｢繧､繝・Β縺ｮJSON繝・・繧ｿ:', editedItem.jsonData);
      
      // ID縺ｮ遒ｺ隱阪→貅門ｙ・・xport_繝励Ξ繝輔ぅ繝・け繧ｹ繧帝勁蜴ｻ・・
      let itemId = editedItem.id || editedItem.chatId;
      if (!itemId) {
        alert('繧｢繧､繝・ΒID縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲ゆｿ晏ｭ倥〒縺阪∪縺帙ｓ縲・);
        return;
      }
      
      // export_繝励Ξ繝輔ぅ繝・け繧ｹ縺後≠繧句ｴ蜷医・髯､蜴ｻ
      if (itemId.startsWith('export_')) {
        itemId = itemId.replace('export_', '');
        // 繝輔ぃ繧､繝ｫ蜷阪・蝣ｴ蜷医・諡｡蠑ｵ蟄舌ｂ髯､蜴ｻ
        if (itemId.endsWith('.json')) {
          itemId = itemId.replace('.json', '');
        }
        // 繝輔ぃ繧､繝ｫ蜷阪°繧営hatId繧呈歓蜃ｺ・・縺ｧ蛹ｺ蛻・ｉ繧後◆2逡ｪ逶ｮ縺ｮ驛ｨ蛻・ｼ・
        const parts = itemId.split('_');
        if (parts.length >= 2 && parts[1].match(/^[a-f0-9-]+$/)) {
          itemId = parts[1];
        }
      }
      
      console.log('菴ｿ逕ｨ縺吶ｋID:', itemId, '蜈・・ID:', editedItem.id || editedItem.chatId);
      
      // 譖ｴ譁ｰ繝・・繧ｿ縺ｮ貅門ｙ・・ditedItem縺ｮ諠・ｱ繧ょ性繧√ｋ・・
      const updatePayload = {
        updatedData: {
          ...editedItem.jsonData,
          // 蝓ｺ譛ｬ諠・ｱ繧・SON繝・・繧ｿ縺ｫ蜷ｫ繧√ｋ
          machineType: editedItem.machineType,
          machineNumber: editedItem.machineNumber,
          title: editedItem.jsonData?.title || editedItem.title,
          lastModified: new Date().toISOString()
        },
        updatedBy: 'user'
      };
      
      console.log('騾∽ｿ｡縺吶ｋ繝壹う繝ｭ繝ｼ繝・', updatePayload);
      
      // 繧ｵ繝ｼ繝舌・縺ｫ譖ｴ譁ｰ繝ｪ繧ｯ繧ｨ繧ｹ繝医ｒ騾∽ｿ｡
      const response = await fetch(`/api/history/update-item/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload)
      });
      
      console.log('繧ｵ繝ｼ繝舌・繝ｬ繧ｹ繝昴Φ繧ｹ:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ隧ｳ邏ｰ:', errorText);
        let errorMessage = `螻･豁ｴ縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆ (${response.status})`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage += ': ' + errorText;
        }
        
        alert(errorMessage);
        return;
      }
      
      const result = await response.json();
      console.log('螻･豁ｴ譖ｴ譁ｰ螳御ｺ・', result);
      
      // 繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ繧よ峩譁ｰ
      if (itemId) {
        const savedKey = 'savedMachineFailureReport_' + itemId;
        localStorage.setItem(savedKey, JSON.stringify(editedItem.jsonData));
        console.log('繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ譖ｴ譁ｰ:', savedKey);
      }
      
      // 螻･豁ｴ繝ｪ繧ｹ繝医・隧ｲ蠖薙い繧､繝・Β繧呈峩譁ｰ
      setHistoryItems(prevItems => 
        prevItems.map(item => 
          (item.id === itemId || item.chatId === itemId) 
            ? { 
                ...item, 
                jsonData: editedItem.jsonData, 
                lastModified: new Date().toISOString(),
                // 蝓ｺ譛ｬ諠・ｱ繧よ峩譁ｰ
                machineType: editedItem.jsonData?.machineType || item.machineType,
                machineNumber: editedItem.jsonData?.machineNumber || item.machineNumber,
                title: editedItem.jsonData?.title || item.title,
                incidentTitle: editedItem.jsonData?.title || item.incidentTitle
              }
            : item
        )
      );
      
      setFilteredItems(prevItems => 
        prevItems.map(item => 
          (item.id === itemId || item.chatId === itemId) 
            ? { 
                ...item, 
                jsonData: editedItem.jsonData, 
                lastModified: new Date().toISOString(),
                // 蝓ｺ譛ｬ諠・ｱ繧よ峩譁ｰ
                machineType: editedItem.jsonData?.machineType || item.machineType,
                machineNumber: editedItem.jsonData?.machineNumber || item.machineNumber,
                title: editedItem.jsonData?.title || item.title,
                incidentTitle: editedItem.jsonData?.title || item.incidentTitle
              }
            : item
        )
      );
      
      // 謌仙粥騾夂衍
      alert('螻･豁ｴ縺梧ｭ｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縲∝・縺ｮ繝輔ぃ繧､繝ｫ縺ｫ荳頑嶌縺堺ｿ晏ｭ倥＆繧後∪縺励◆縲・);
      
      // 邱ｨ髮・ム繧､繧｢繝ｭ繧ｰ繧帝哩縺倥ｋ
      setShowEditDialog(false);
      setEditingItem(null);
      
      // 螻･豁ｴ繝ｪ繧ｹ繝医・蜀崎ｪｭ縺ｿ霎ｼ縺ｿ縺ｯ陦後ｏ縺ｪ縺・ｼ域里縺ｫ譖ｴ譁ｰ貂医∩・・
      console.log('螻･豁ｴ譖ｴ譁ｰ螳御ｺ・- 繝ｪ繧ｹ繝亥・隱ｭ縺ｿ霎ｼ縺ｿ繧偵せ繧ｭ繝・・');
      
    } catch (error) {
      console.error('螻･豁ｴ菫晏ｭ倥お繝ｩ繝ｼ:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert('螻･豁ｴ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆: ' + errorMessage);
    }
  };

  const extractJsonInfo = (jsonData: any) => {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      return {
        title: data.title || data.name || '',
        description: data.description || data.content || '',
        emergencyMeasures: data.emergencyMeasures || data.measures || ''
      };
    } catch (error) {
      return {
        title: '',
        description: '',
        emergencyMeasures: ''
      };
    }
  };

  // 讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌縺ｮHTML逕滓・髢｢謨ｰ
  const generateMachineFailureReportHTML = (reportData: any): string => {
    // JSON繝・・繧ｿ繧貞ｮ牙・縺ｫ繧ｨ繧ｹ繧ｱ繝ｼ繝励☆繧矩未謨ｰ・亥ｼｷ蛹也沿・・
    const safeJsonStringify = (obj: any): string => {
      try {
        let jsonStr = JSON.stringify(obj);
        // HTML縺ｨJavaScript縺ｧ蝠城｡後↓縺ｪ繧区枚蟄励ｒ蠕ｹ蠎慕噪縺ｫ繧ｨ繧ｹ繧ｱ繝ｼ繝・
        jsonStr = jsonStr
          .replace(/\\/g, '\\\\')     // 繝舌ャ繧ｯ繧ｹ繝ｩ繝・す繝･繧呈怙蛻昴↓繧ｨ繧ｹ繧ｱ繝ｼ繝・
          .replace(/"/g, '\\"')       // 繝繝悶Ν繧ｯ繧ｩ繝ｼ繝・
          .replace(/'/g, "\\'")       // 繧ｷ繝ｳ繧ｰ繝ｫ繧ｯ繧ｩ繝ｼ繝・
          .replace(/</g, '\\u003c')   // <
          .replace(/>/g, '\\u003e')   // >
          .replace(/&/g, '\\u0026')   // &
          .replace(/\//g, '\\/')      // 繧ｹ繝ｩ繝・す繝･
          .replace(/:/g, '\\u003a')   // 繧ｳ繝ｭ繝ｳ・磯㍾隕・ｼ・
          .replace(/\r/g, '\\r')      // 繧ｭ繝｣繝ｪ繝・ず繝ｪ繧ｿ繝ｼ繝ｳ
          .replace(/\n/g, '\\n')      // 謾ｹ陦・
          .replace(/\t/g, '\\t')      // 繧ｿ繝・
          .replace(/\f/g, '\\f')      // 繝輔か繝ｼ繝繝輔ぅ繝ｼ繝・
          .replace(/\b/g, '\\b')      // 繝舌ャ繧ｯ繧ｹ繝壹・繧ｹ
          .replace(/\u2028/g, '\\u2028') // 繝ｩ繧､繝ｳ繧ｻ繝代Ξ繝ｼ繧ｿ
          .replace(/\u2029/g, '\\u2029'); // 繝代Λ繧ｰ繝ｩ繝輔そ繝代Ξ繝ｼ繧ｿ
        
        console.log('肌 safeJsonStringify result length:', jsonStr.length);
        console.log('肌 safeJsonStringify sample:', jsonStr.substring(0, 100) + '...');
        return jsonStr;
      } catch (e) {
        console.error('JSON縺ｮ繧ｷ繝ｪ繧｢繝ｩ繧､繧ｺ縺ｫ螟ｱ謨・', e);
        return '{}';
      }
    };
    // 逕ｻ蜒上ｒ蜿朱寔・・ase64縺ｮ縺ｿ縲∬ｩｳ邏ｰ縺ｪ繝・ヰ繝・げ莉倥″・・
    const collectImages = (data: any): Array<{ id: string; url: string; fileName: string; description?: string }> => {
      console.log('名・・逕ｻ蜒丞庶髮・幕蟋・- reportData:', data);
      console.log('名・・reportData keys:', Object.keys(data || {}));
      
      const images: Array<{ id: string; url: string; fileName: string; description?: string }> = [];
      const imageUrls = new Set<string>();
      
      // 繝・ヰ繝・げ: 繝・・繧ｿ讒矩繧定ｩｳ邏ｰ遒ｺ隱・
      console.log('名・・繝・・繧ｿ讒矩遒ｺ隱・');
      console.log('名・・- chatData:', data?.chatData ? '縺ゅｊ' : '縺ｪ縺・);
      console.log('名・・- chatData.messages:', data?.chatData?.messages ? '縺ゅｊ(' + data.chatData.messages.length + '莉ｶ)' : '縺ｪ縺・);
      console.log('名・・- conversationHistory:', data?.conversationHistory ? '縺ゅｊ(' + (Array.isArray(data.conversationHistory) ? data.conversationHistory.length : 'non-array') + ')' : '縺ｪ縺・);
      console.log('名・・- originalChatData.messages:', data?.originalChatData?.messages ? '縺ゅｊ(' + data.originalChatData.messages.length + ')' : '縺ｪ縺・);
      console.log('名・・- messages:', data?.messages ? '縺ゅｊ(' + (Array.isArray(data.messages) ? data.messages.length : 'non-array') + ')' : '縺ｪ縺・);
      
      // 1) chatData.messages 縺九ｉ base64 逕ｻ蜒上ｒ謗｢縺呻ｼ医Γ繧､繝ｳ・・
      if (data?.chatData?.messages && Array.isArray(data.chatData.messages)) {
        console.log('名・・chatData.messages繧偵せ繧ｭ繝｣繝ｳ荳ｭ...');
        data.chatData.messages.forEach((message: any, messageIndex: number) => {
          console.log('名・・message[' + messageIndex + ']:', { 
            id: message?.id, 
            content: message?.content ? message.content.substring(0, 50) + '...' : '縺ｪ縺・,
            isBase64: message?.content?.startsWith('data:image/') 
          });
          
          if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();
            
            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `chatdata-${messageIndex}`,
                url: normalizedContent,
                fileName: `謨・囿逕ｻ蜒・{images.length + 1}`,
                description: '謨・囿邂・園逕ｻ蜒擾ｼ・hatData.messages・・
              });
              console.log('名・・Base64逕ｻ蜒剰ｦ九▽縺九ｊ縺ｾ縺励◆・・hatData.messages・・', images.length);
            }
          }
        });
      }
      
      // 2) conversationHistory 縺九ｉ base64 逕ｻ蜒上ｒ謗｢縺・
      if (data?.conversationHistory && Array.isArray(data.conversationHistory)) {
        console.log('名・・conversationHistory繧偵せ繧ｭ繝｣繝ｳ荳ｭ...');
        data.conversationHistory.forEach((message: any, messageIndex: number) => {
          if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();
            
            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `conversation-${messageIndex}`,
                url: normalizedContent,
                fileName: `謨・囿逕ｻ蜒・{images.length + 1}`,
                description: '謨・囿邂・園逕ｻ蜒擾ｼ・onversationHistory・・
              });
              console.log('名・・Base64逕ｻ蜒剰ｦ九▽縺九ｊ縺ｾ縺励◆・・onversationHistory・・', images.length);
            }
          }
        });
      }
      
      // 3) originalChatData.messages 縺九ｉ base64 逕ｻ蜒上ｒ謗｢縺・
      if (data?.originalChatData?.messages && Array.isArray(data.originalChatData.messages)) {
        console.log('名・・originalChatData.messages繧偵せ繧ｭ繝｣繝ｳ荳ｭ...');
        data.originalChatData.messages.forEach((message: any, messageIndex: number) => {
          if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();
            
            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `original-${messageIndex}`,
                url: normalizedContent,
                fileName: `謨・囿逕ｻ蜒・{images.length + 1}`,
                description: '謨・囿邂・園逕ｻ蜒擾ｼ・riginalChatData・・
              });
              console.log('名・・Base64逕ｻ蜒剰ｦ九▽縺九ｊ縺ｾ縺励◆・・riginalChatData・・', images.length);
            }
          }
        });
      }
      
      // 4) messages 縺九ｉ base64 逕ｻ蜒上ｒ謗｢縺・
      if (data?.messages && Array.isArray(data.messages)) {
        console.log('名・・messages繧偵せ繧ｭ繝｣繝ｳ荳ｭ...');
        data.messages.forEach((message: any, messageIndex: number) => {
          if (message?.content && typeof message.content === 'string' && message.content.startsWith('data:image/')) {
            const normalizedContent = message.content
              .replace(/\r?\n/g, '')
              .replace(/[""]/g, '"')
              .trim();
            
            if (!imageUrls.has(normalizedContent)) {
              imageUrls.add(normalizedContent);
              images.push({
                id: `messages-${messageIndex}`,
                url: normalizedContent,
                fileName: `謨・囿逕ｻ蜒・{images.length + 1}`,
                description: '謨・囿邂・園逕ｻ蜒擾ｼ・essages・・
              });
              console.log('名・・Base64逕ｻ蜒剰ｦ九▽縺九ｊ縺ｾ縺励◆・・essages・・', images.length);
            }
          }
        });
      }
      
      console.log('名・・逕ｻ蜒丞庶髮・ｵ先棡・・ase64縺ｮ縺ｿ・・', images.length + '莉ｶ縺ｮ逕ｻ蜒・);
      images.forEach((img, index) => {
        console.log('名・・逕ｻ蜒充' + index + ']:', img.description, '-', img.url.substring(0, 50) + '...');
      });
      
      return images;
    };
    
    const collectedImages = collectImages(reportData);
    const imageSection = collectedImages && collectedImages.length > 0 
      ? `             <div class="image-section">
               <h3>謨・囿邂・園逕ｻ蜒・/h3>
               <div class="image-grid">
                 ${collectedImages.map((image, index) => `
                   <div class="image-item">
                     <img class="report-img" 
                          src="${image.url}" 
                          alt="謨・囿逕ｻ蜒・{index + 1}" />
                   </div>
                 `).join('')}
               </div>
             </div>`
      : '';

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Yu Mincho', 'YuMincho', 'Hiragino Mincho ProN', 'Hiragino Mincho Pro', 'HGS譏取悃', 'MS Mincho', serif;
            font-size: 12pt;
            line-height: 1.4;
            color: #000;
            background: white;
            max-width: 100%;
            overflow-x: hidden;
          }
          
          /* 蜊ｰ蛻ｷ譎ゅ・縺ｿ譁・ｭ励し繧､繧ｺ繧偵＆繧峨↓邵ｮ蟆上＠縺ｦA4荳譫壹↓蜿弱ａ繧・*/
          @media print {
            body {
              font-size: 10pt;
              line-height: 1.2;
            }
            
            .header h1 {
              font-size: 16pt;
              margin-bottom: 5px;
            }
            
            .section h2 {
              font-size: 12pt;
              margin-bottom: 5px;
            }
            
            .info-item strong,
            .info-item span,
            .info-item input,
            .info-item textarea,
            .content-box strong,
            .content-box p {
              font-size: 10pt;
            }
            
            .header p {
              font-size: 10pt;
            }
            
            input, textarea, .editable {
              font-size: 10pt;
            }
            
            /* 蜊ｰ蛻ｷ譎ゅ・繝ｬ繧､繧｢繧ｦ繝域怙驕ｩ蛹・*/
            .section {
              margin-bottom: 8px;
              page-break-inside: avoid;
            }
            
            .info-grid {
              gap: 4px;
              margin-bottom: 8px;
            }
            
            .info-item {
              padding: 4px;
            }
            
            .content-box {
              padding: 4px;
              margin-top: 4px;
            }
            
            .image-grid {
              gap: 4px;
              margin: 4px 0;
              grid-template-columns: repeat(2, 1fr);
              max-width: 300px;
            }
            
            .report-img {
              max-width: 120px;
              max-height: 80px;
            }
            
            /* A4荳譫壹↓蜿弱ａ繧九◆繧√・隱ｿ謨ｴ */
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            
            .container {
              max-height: 260mm;
              overflow: hidden;
            }
            
            .action-buttons { 
              display: none !important; 
            }
            
            body { 
              margin: 0; 
              padding: 0;
            }
          }
          
          .container {
            max-width: 100%;
            padding: 0;
          }
          
          .header {
            text-align: center;
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 2px solid #333;
          }
          
          .header h1 {
            font-size: 27pt;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          /* 邱ｨ髮・Δ繝ｼ繝画凾縺ｮ繝倥ャ繝繝ｼ邨ｱ荳 */
          .edit-mode .header h1 {
            font-size: 27pt;
            font-weight: bold;
          }
          
          .section h2 {
            font-size: 20pt;
            font-weight: bold;
            color: #000;
            border-bottom: 1px solid #ccc;
            padding-bottom: 4px;
            margin-bottom: 8px;
          }
          
          /* 邱ｨ髮・Δ繝ｼ繝画凾縺ｮ繧ｻ繧ｯ繧ｷ繝ｧ繝ｳ隕句・縺礼ｵｱ荳 */
          .edit-mode .section h2 {
            font-size: 20pt;
            font-weight: bold;
            color: #000;
          }
          
          .info-item strong {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
          }
          
          .info-item span,
          .info-item input,
          .info-item textarea {
            font-size: 18pt;
            color: #000;
          }
          
          .header p {
            font-size: 18pt;
            color: #000;
          }
          
          /* 邱ｨ髮・Δ繝ｼ繝画凾縺ｮ繝倥ャ繝繝ｼ譌･莉倡ｵｱ荳 */
          .edit-mode .header p {
            font-size: 18pt;
            color: #000;
          }
          
          .section {
            margin-bottom: 10px;
            page-break-inside: avoid;
          }
          

          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 8px;
          }
          
          .info-item {
            padding: 8px;
            background-color: #f8f8f8;
            border: 1px solid #ccc;
            border-radius: 3px;
          }
          

          
          .content-box {
            background-color: #f8f8f8;
            padding: 6px;
            border: 1px solid #ddd;
            border-radius: 3px;
            margin-top: 4px;
          }
          
          .content-box p {
            font-size: 8pt;
            line-height: 1.3;
            margin: 0;
          }
          
          .image-section {
            margin: 12px 0;
            padding-left: 20px;
            page-break-inside: avoid;
          }
          
          .image-section h3 {
            font-size: 10pt;
            margin-bottom: 8px;
            text-align: left;
          }
          
          .image-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin: 8px 0;
            max-width: 600px;
          }
          
          .image-item {
            text-align: center;
            page-break-inside: avoid;
          }
          
          .report-img {
            max-width: 120px;
            max-height: 80px;
            width: auto;
            height: auto;
            border: 1px solid #ccc;
            border-radius: 3px;
            object-fit: cover;
            transition: all 0.2s ease;
          }
          
          .resizable-image {
            position: relative;
            cursor: move;
            user-select: none;
          }
          
          .resizable-image:hover {
            border: 2px solid #007bff;
            transform: scale(1.02);
          }
          
          .resizable-image.dragging {
            opacity: 0.7;
            transform: scale(1.1);
            z-index: 1000;
          }
          
          .image-caption {
            text-align: center;
            margin-top: 5px;
            font-size: 8pt;
            color: #666;
          }
          
          .footer {
            text-align: center;
            margin-top: 8px;
            padding-top: 6px;
            border-top: 1px solid #ccc;
            font-size: 7pt;
            color: #666;
          }
          
          .action-buttons {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000;
            display: flex;
            gap: 10px;
          }
          
          .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
          }
          
          .btn-print {
            background: #28a745;
            color: white;
            padding: 20px 40px; /* 2蛟阪し繧､繧ｺ */
            font-size: 28px; /* 2蛟阪し繧､繧ｺ */
          }
          
          .btn-save {
            background: #ffc107;
            color: #000;
          }
          
          .btn-cancel {
            background: #6c757d;
            color: white;
            padding: 20px 40px; /* 2蛟阪し繧､繧ｺ */
            font-size: 28px; /* 2蛟阪し繧､繧ｺ */
          }
          
          .btn-close {
            background: #6c757d;
            color: white;
          }
          
          .readonly {
            display: block;
          }
          
          .editable {
            display: none;
            background-color: #f0f0f0;
            color: #000;
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 8px;
            font-size: 18pt;
          }
          
          /* 邱ｨ髮・Δ繝ｼ繝画凾縺ｮ譁・ｭ励し繧､繧ｺ繧呈ｩ滓｢ｰ謨・囿蝣ｱ蜻頑嶌UI縺ｫ蜷医ｏ縺帙ｋ */
          .edit-mode .editable {
            font-size: 18pt;
          }
          
          .edit-mode .info-item strong {
            font-size: 18pt;
          }
          
          .edit-mode .info-item span {
            font-size: 18pt;
          }
          
          .edit-mode .content-box strong {
            font-size: 18pt;
          }
          
          .edit-mode .content-box p {
            font-size: 18pt;
          }
          
          /* 邱ｨ髮・Δ繝ｼ繝画凾縺ｮ陦ｨ遉ｺ蛻・ｊ譖ｿ縺・- 遒ｺ螳溘↓蜍穂ｽ懊☆繧九ｈ縺・↓蠑ｷ蛹・*/
          .edit-mode .readonly {
            display: none !important;
            visibility: hidden !important;
          }
          
          .edit-mode .editable {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            padding: 8px !important;
            border: 2px solid #007bff !important;
            border-radius: 3px !important;
            font-size: 14pt !important;
            color: #000 !important;
            background-color: #fff !important;
            font-family: inherit !important;
          }
          
          /* 繝・ヵ繧ｩ繝ｫ繝医〒邱ｨ髮・ｦ∫ｴ繧堤｢ｺ螳溘↓髱櫁｡ｨ遉ｺ */
          .editable {
            display: none !important;
            visibility: hidden !important;
          }
          
          /* 隱ｭ縺ｿ蜿悶ｊ蟆ら畑隕∫ｴ繧偵ョ繝輔か繝ｫ繝医〒陦ｨ遉ｺ */
          .readonly {
            display: inline !important;
            visibility: visible !important;
          }
          
          input, textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 3px;
            font-size: 18pt;
            color: #000;
          }
          
          /* 邱ｨ髮・Δ繝ｼ繝画凾縺ｮ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨せ繧ｿ繧､繝ｫ邨ｱ荳 */
          .edit-mode input,
          .edit-mode textarea {
            font-size: 18pt;
            color: #000;
          }
          
          .content-box strong {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
          }
          
          .content-box p {
            font-size: 18pt;
            color: #000;
          }
          
          @media print {
            .action-buttons { display: none !important; }
            body { margin: 0; }
          }
          
          /* 邱ｨ髮・Δ繝ｼ繝臥畑繧ｹ繧ｿ繧､繝ｫ */
          .readonly {
            display: inline;
          }
          
          .editable {
            display: none !important;
            padding: 4px 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
            box-sizing: border-box;
          }
          
          .edit-mode .readonly {
            display: none !important;
          }
          
          .edit-mode .editable {
            display: block !important;
            background-color: #ffffcc;
            border: 2px solid #007bff;
          }
          
          .btn {
            padding: 8px 16px;
            margin: 0 4px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          
          .btn-save {
            background-color: #28a745;
            color: white;
          }
          
          .btn-cancel {
            background-color: #6c757d;
            color: white;
            padding: 20px 40px; /* 2蛟阪し繧､繧ｺ */
            font-size: 28px; /* 2蛟阪し繧､繧ｺ */
          }
          
          .btn-print {
            background-color: #17a2b8;
            color: white;
            padding: 20px 40px; /* 2蛟阪し繧､繧ｺ */
            font-size: 28px; /* 2蛟阪し繧､繧ｺ */
          }
          
          .btn-close {
            background-color: #dc3545;
            color: white;
          }
        </style>
      </head>
      <body>
        <script>
          // 繧ｷ繝ｳ繝励Ν縺ｧ遒ｺ螳溘↑險ｭ螳・
          window.reportData = {};
          console.log('Script starting...');
        </script>
        <div class="action-buttons">
          <button class="btn btn-save" id="save-btn" style="display: none;">菫晏ｭ・/button>
          <button class="btn btn-print" onclick="window.print()">蜊ｰ蛻ｷ</button>
          <button class="btn btn-cancel" id="cancel-btn" style="display: none;">繧ｭ繝｣繝ｳ繧ｻ繝ｫ</button>
          <button class="btn btn-close" onclick="window.close()">髢峨§繧・/button>
        </div>
        
        <div class="container">
          <div class="header">
            <h1>讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌</h1>
            <p>蜊ｰ蛻ｷ譌･譎・ ${new Date().toLocaleString('ja-JP')}</p>
          </div>
          
          <div class="section">
            <h2>蝣ｱ蜻頑ｦりｦ・/h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>蝣ｱ蜻頑嶌ID</strong>
                <span class="readonly">${(reportData.reportId || reportData.id || '').substring(0, 8)}...</span>
                <input class="editable" value="${reportData.reportId || reportData.id || ''}" />
              </div>
              <div class="info-item">
                <strong>讖溽ｨｮ</strong>
                <span class="readonly">${reportData.machineType || reportData.machineTypeName || '-'}</span>
                <input class="editable" value="${reportData.machineType || reportData.machineTypeName || ''}" />
              </div>
              <div class="info-item">
                <strong>讖滓｢ｰ逡ｪ蜿ｷ</strong>
                <span class="readonly">${reportData.machineNumber || '-'}</span>
                <input class="editable" value="${reportData.machineNumber || ''}" />
              </div>
              <div class="info-item">
                <strong>譌･莉・/strong>
                <span class="readonly">${reportData.date ? new Date(reportData.date).toLocaleDateString('ja-JP') : reportData.timestamp ? new Date(reportData.timestamp).toLocaleDateString('ja-JP') : reportData.createdAt ? new Date(reportData.createdAt).toLocaleDateString('ja-JP') : '-'}</span>
                <input class="editable" type="date" value="${reportData.date || reportData.timestamp || reportData.createdAt || ''}" />
              </div>
              <div class="info-item">
                <strong>蝣ｴ謇</strong>
                <span class="readonly">${reportData.location || '-'}</span>
                <input class="editable" value="${reportData.location || ''}" />
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>謨・囿隧ｳ邏ｰ</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>繧ｹ繝・・繧ｿ繧ｹ</strong>
                <span class="readonly">${reportData.status || '-'}</span>
                <input class="editable" value="${reportData.status || ''}" />
              </div>
              <div class="info-item">
                <strong>雋ｬ莉ｻ閠・/strong>
                <span class="readonly">${reportData.engineer || '-'}</span>
                <input class="editable" value="${reportData.engineer || ''}" />
              </div>
            </div>
            
            <div class="content-box">
              <strong>隱ｬ譏・/strong>
              <p class="readonly">${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || '隱ｬ譏弱↑縺・}</p>
              <textarea class="editable" rows="4">${reportData.problemDescription || reportData.description || reportData.incidentTitle || reportData.title || ''}</textarea>
            </div>
            
            <div class="content-box">
              <strong>蛯呵・/strong>
              <p class="readonly">${reportData.notes || '-'}</p>
              <textarea class="editable" rows="4">${reportData.notes || ''}</textarea>
            </div>
          </div>
          
          ${imageSection}
          
          <div class="section">
            <h2>菫ｮ郢戊ｨ育判</h2>
            <div class="info-grid">
              <div class="info-item">
                <strong>萓晞ｼ譛域律</strong>
                <span class="readonly">${reportData.requestDate || '-'}</span>
                <input class="editable" type="date" value="${reportData.requestDate || ''}" />
              </div>
              <div class="info-item">
                <strong>莠亥ｮ壽怦譌･</strong>
                <span class="readonly">${reportData.repairSchedule || '-'}</span>
                <input class="editable" type="date" value="${reportData.repairSchedule || ''}" />
              </div>
              <div class="info-item">
                <strong>蝣ｴ謇</strong>
                <span class="readonly">${reportData.repairLocation || '-'}</span>
                <input class="editable" value="${reportData.repairLocation || ''}" />
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>險倅ｺ区ｬ・/h2>
            <div class="info-item">
              <strong>蛯呵・・險倅ｺ・/strong>
              <p class="readonly">${reportData.remarks || '-'}</p>
              <textarea class="editable" rows="4" maxlength="200">${reportData.remarks || ''}</textarea>
            </div>
          </div>
          
          <div class="footer">
            <p>ﾂｩ 2025 讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌. All rights reserved.</p>
          </div>
        </div>
        
        <script>
          let isEditMode = false;
          let originalData = {};
          
          // 繝・・繧ｿ繧貞ｮ牙・縺ｫ險ｭ螳壹☆繧矩未謨ｰ
          function setOriginalData(data) {
            try {
              originalData = data;
              console.log('肌 originalData set:', originalData);
            } catch (e) {
              console.error('originalData縺ｮ險ｭ螳壹↓螟ｱ謨・', e);
              originalData = {};
            }
          }
          
          // 繝ｬ繝昴・繝医ョ繝ｼ繧ｿ繧定ｨｭ螳夲ｼ医げ繝ｭ繝ｼ繝舌Ν螟画焚縺九ｉ隱ｭ縺ｿ蜿悶ｊ・・
          try {
            if (window.reportData) {
              setOriginalData(window.reportData);
              console.log('肌 繝・・繧ｿ繧偵げ繝ｭ繝ｼ繝舌Ν螟画焚縺九ｉ豁｣蟶ｸ縺ｫ隱ｭ縺ｿ霎ｼ縺ｿ縺ｾ縺励◆');
            } else {
              console.error('肌 繧ｰ繝ｭ繝ｼ繝舌Ν螟画焚window.reportData縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
              setOriginalData({});
            }
          } catch (e) {
            console.error('肌 繧ｰ繝ｭ繝ｼ繝舌Ν螟画焚縺九ｉ縺ｮ繝・・繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ縺ｫ螟ｱ謨・', e);
            setOriginalData({});
          }
          
          // 逕ｻ蜒剰｡ｨ遉ｺ縺ｮ蛻晄悄蛹悶→繝懊ち繝ｳ繧､繝吶Φ繝医・險ｭ螳・
          document.addEventListener('DOMContentLoaded', function() {
            console.log('肌 DOMContentLoaded - Document ready');
            console.log('肌 Available edit elements:');
            console.log('肌 - Readonly elements:', document.querySelectorAll('.readonly').length);
            console.log('肌 - Editable elements:', document.querySelectorAll('.editable').length);
            console.log('肌 - Edit button:', !!document.querySelector('.btn-edit'));
            console.log('肌 Initial CSS classes:', document.body.classList.toString());
            console.log('肌 originalData:', originalData);
            
            // 蛻晄悄迥ｶ諷九〒縺ｯ邱ｨ髮・Δ繝ｼ繝峨ｒ繧ｪ繝輔↓縺吶ｋ
            isEditMode = false;
            document.body.classList.remove('edit-mode');
            
            // 繝懊ち繝ｳ繧､繝吶Φ繝医・險ｭ螳・
            setupButtonEvents();
            
            // 隍・焚蝗槫ｮ溯｡後＠縺ｦ遒ｺ螳溘↓險ｭ螳・
            setTimeout(() => {
              setupButtonEvents();
            }, 100);
            
            setTimeout(() => {
              setupButtonEvents();
            }, 500);
          });
          
          // 繝懊ち繝ｳ繧､繝吶Φ繝医ｒ險ｭ螳壹☆繧矩未謨ｰ
          function setupButtonEvents() {
            console.log('肌 setupButtonEvents called');
            
            // DOM隕∫ｴ縺ｮ遒ｺ螳溘↑蜿門ｾ励・縺溘ａ蟆代＠蠕・ｩ・
            setTimeout(() => {
              const editBtn = document.getElementById('edit-btn');
              const saveBtn = document.getElementById('save-btn');
              const cancelBtn = document.getElementById('cancel-btn');
              
              console.log('肌 繝懊ち繝ｳ縺ｮ蜿門ｾ礼憾豕・', {
                editBtn: !!editBtn,
                saveBtn: !!saveBtn,
                cancelBtn: !!cancelBtn
              });
              
              if (editBtn) {
                console.log('肌 Edit button found, setting up event listener');
                
                // 譌｢蟄倥・繧､繝吶Φ繝医Μ繧ｹ繝翫・繧偵け繝ｪ繧｢
                const newEditBtn = editBtn.cloneNode(true);
                editBtn.parentNode?.replaceChild(newEditBtn, editBtn);
                
                // 譁ｰ縺励＞繧､繝吶Φ繝医Μ繧ｹ繝翫・繧定ｿｽ蜉
                newEditBtn.addEventListener('click', function(e) {
                  console.log('肌 Edit button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    console.log('肌 Calling toggleEditMode()...');
                    toggleEditMode();
                  } catch (error) {
                    console.error('肌 Error in toggleEditMode:', error);
                    alert('邱ｨ髮・Δ繝ｼ繝峨・蛻・ｊ譖ｿ縺医〒繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ' + error.message);
                  }
                });
                
                // 繝懊ち繝ｳ繧ｹ繧ｿ繧､繝ｫ繧定ｨｭ螳・
                newEditBtn.style.pointerEvents = 'auto';
                newEditBtn.style.cursor = 'pointer';
                newEditBtn.style.backgroundColor = '#007bff';
                newEditBtn.style.color = 'white';
                newEditBtn.style.border = '1px solid #007bff';
                newEditBtn.style.borderRadius = '4px';
                newEditBtn.style.padding = '8px 16px';
                newEditBtn.style.fontSize = '14px';
                
                console.log('肌 Edit button event listener added successfully');
              } else {
              console.error('肌 Edit button not found!');
              }
              
              if (saveBtn) {
                const newSaveBtn = saveBtn.cloneNode(true);
                saveBtn.parentNode?.replaceChild(newSaveBtn, saveBtn);
                
                newSaveBtn.addEventListener('click', function(e) {
                  console.log('肌 Save button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    saveReport();
                  } catch (error) {
                    console.error('肌 Error in saveReport:', error);
                    alert('菫晏ｭ倥〒繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ' + error.message);
                  }
                });
              }
              
              if (cancelBtn) {
                const newCancelBtn = cancelBtn.cloneNode(true);
                cancelBtn.parentNode?.replaceChild(newCancelBtn, cancelBtn);
                
                newCancelBtn.addEventListener('click', function(e) {
                  console.log('肌 Cancel button click event triggered');
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    toggleEditMode();
                  } catch (error) {
                    console.error('肌 Error in toggleEditMode (cancel):', error);
                  }
                });
              }
              
              console.log('肌 Button event setup complete');
            }, 200); // DOM隕∫ｴ縺檎｢ｺ螳溘↓蟄伜惠縺吶ｋ縺ｾ縺ｧ蠕・ｩ・
          }          function toggleEditMode() {
            console.log('肌 toggleEditMode called, current isEditMode:', isEditMode);
            console.log('肌 Current document body classList before toggle:', document.body.classList.toString());
            
            isEditMode = !isEditMode;
            console.log('肌 toggled isEditMode to:', isEditMode);
            
            const editBtn = document.getElementById('edit-btn');
            const cancelBtn = document.getElementById('cancel-btn');
            const saveBtn = document.getElementById('save-btn');
            
            console.log('肌 Found buttons:', { editBtn: !!editBtn, cancelBtn: !!cancelBtn, saveBtn: !!saveBtn });
            
            if (isEditMode) {
              console.log('肌 Entering edit mode...');
              
              // 繝懊ち繝ｳ陦ｨ遉ｺ縺ｮ螟画峩
              if (editBtn) {
                editBtn.style.display = 'none';
                console.log('肌 Edit button hidden');
              }
              if (cancelBtn) {
                cancelBtn.style.display = 'inline-block';
                cancelBtn.style.backgroundColor = '#6c757d';
                cancelBtn.style.color = 'white';
                cancelBtn.style.border = '1px solid #6c757d';
                cancelBtn.style.borderRadius = '4px';
                cancelBtn.style.padding = '8px 16px';
                cancelBtn.style.fontSize = '14px';
                cancelBtn.style.cursor = 'pointer';
                console.log('肌 Cancel button shown');
              }
              if (saveBtn) {
                saveBtn.style.display = 'inline-block';
                saveBtn.style.backgroundColor = '#28a745';
                saveBtn.style.color = 'white';
                saveBtn.style.border = '1px solid #28a745';
                saveBtn.style.borderRadius = '4px';
                saveBtn.style.padding = '8px 16px';
                saveBtn.style.fontSize = '14px';
                saveBtn.style.cursor = 'pointer';
                console.log('肌 Save button shown');
              }
              
              // 邱ｨ髮・Δ繝ｼ繝峨け繝ｩ繧ｹ繧定ｿｽ蜉
              document.body.classList.add('edit-mode');
              console.log('肌 Added edit-mode class, classList:', document.body.classList.toString());
              
              // 隕∫ｴ縺ｮ陦ｨ遉ｺ繧堤｢ｺ螳溘↓蛻・ｊ譖ｿ縺・
              const readonlyElements = document.querySelectorAll('.readonly');
              const editableElements = document.querySelectorAll('.editable');
              
              console.log('肌 Found elements for toggle:', { 
                readonly: readonlyElements.length, 
                editable: editableElements.length 
              });
              
              readonlyElements.forEach((el, index) => {
                el.style.display = 'none !important';
                el.style.visibility = 'hidden';
                console.log('肌 Hidden readonly element', index);
              });
              
              editableElements.forEach((el, index) => {
                el.style.display = 'block !important';
                el.style.visibility = 'visible';
                // 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨・閭梧勹濶ｲ繧貞､画峩縺励※邱ｨ髮・ｸｭ縺ｧ縺ゅｋ縺薙→繧呈・遒ｺ縺ｫ縺吶ｋ
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                  el.style.backgroundColor = '#ffffcc';
                  el.style.border = '2px solid #007bff';
                  el.removeAttribute('readonly');
                  el.removeAttribute('disabled');
                }
                console.log('肌 Shown editable element', index, 'tag:', el.tagName);
              });
              
              // 邱ｨ髮・Δ繝ｼ繝画凾縺ｫ蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨・蛟､繧定ｨｭ螳・
              setupEditFields();
              
              console.log('肌 Edit mode setup complete');
            } else {
              console.log('肌 Exiting edit mode...');
              
              // 繝懊ち繝ｳ陦ｨ遉ｺ縺ｮ螟画峩
              if (editBtn) {
                editBtn.style.display = 'inline-block';
                console.log('肌 Edit button shown');
              }
              if (cancelBtn) {
                cancelBtn.style.display = 'none';
                console.log('肌 Cancel button hidden');
              }
              if (saveBtn) {
                saveBtn.style.display = 'none';
                console.log('肌 Save button hidden');
              }
              
              // 邱ｨ髮・Δ繝ｼ繝峨け繝ｩ繧ｹ繧貞炎髯､
              document.body.classList.remove('edit-mode');
              console.log('肌 Removed edit-mode class, classList:', document.body.classList.toString());
              
              // 隕∫ｴ縺ｮ陦ｨ遉ｺ繧堤｢ｺ螳溘↓蛻・ｊ譖ｿ縺・
              const readonlyElements = document.querySelectorAll('.readonly');
              const editableElements = document.querySelectorAll('.editable');
              
              readonlyElements.forEach((el, index) => {
                el.style.display = 'inline';
                el.style.visibility = 'visible';
                console.log('肌 Shown readonly element', index);
              });
              
              editableElements.forEach((el, index) => {
                el.style.display = 'none !important';
                el.style.visibility = 'hidden';
                console.log('肌 Hidden editable element', index);
              });
              
              // 邱ｨ髮・・螳ｹ繧貞・縺ｫ謌ｻ縺・
              resetToOriginal();
              
              console.log('肌 Read-only mode setup complete');
            }
          }
                console.log('肌 Save button hidden');
              }
              
              // 邱ｨ髮・Δ繝ｼ繝峨け繝ｩ繧ｹ繧貞炎髯､
              document.body.classList.remove('edit-mode');
              console.log('肌 Removed edit-mode class, classList:', document.body.classList.toString());
              
              // 隕∫ｴ縺ｮ陦ｨ遉ｺ繧貞ｼｷ蛻ｶ逧・↓蛻・ｊ譖ｿ縺・
              readonlyElements.forEach((el, index) => {
                el.style.display = 'inline';
                el.style.visibility = 'visible';
                console.log('肌 Shown readonly element', index);
              });
              
              editableElements.forEach((el, index) => {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                console.log('肌 Hidden editable element', index);
              });
              
              // 邱ｨ髮・・螳ｹ繧貞・縺ｫ謌ｻ縺・
              resetToOriginal();
              
              console.log('肌 Read-only mode setup complete');
            }
          }
          
          // 繧ｰ繝ｭ繝ｼ繝舌Ν繧ｹ繧ｳ繝ｼ繝励〒繧ょ茜逕ｨ蜿ｯ閭ｽ縺ｫ縺吶ｋ
          window.toggleEditMode = toggleEditMode;
          
          // 繝壹・繧ｸ縺悟ｮ悟・縺ｫ隱ｭ縺ｿ霎ｼ縺ｾ繧後◆蠕後↓繧ゅ・繧ｿ繝ｳ繧､繝吶Φ繝医ｒ蜀崎ｨｭ螳・
          window.addEventListener('load', function() {
            console.log('肌 Window load event - page fully loaded');
            setTimeout(() => {
              setupButtonEvents();
            }, 500);
          });
          
          function setupEditFields() {
            console.log('肌 setupEditFields called');
            // 蜷・・蜉帙ヵ繧｣繝ｼ繝ｫ繝峨↓驕ｩ蛻・↑蛟､繧定ｨｭ螳・
            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');
            
            console.log('肌 Found inputs:', inputs.length, 'textareas:', textareas.length);
            
            // 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨・蛟､繧定ｨｭ螳・
            inputs.forEach((input, index) => {
              console.log('肌 Setting up input', index, input);
              if (index === 0) input.value = originalData.reportId || originalData.id || '';
              if (index === 1) input.value = originalData.machineType || originalData.machineTypeName || '';
              if (index === 2) input.value = originalData.machineNumber || '';
              if (index === 3) {
                const dateValue = originalData.date || originalData.timestamp || originalData.createdAt;
                if (dateValue) {
                  const date = new Date(dateValue);
                  input.value = date.toISOString().split('T')[0];
                }
              }
              if (index === 4) input.value = originalData.location || '';
              if (index === 5) input.value = originalData.status || '';
              if (index === 6) input.value = originalData.engineer || '';
              if (index === 7) input.value = originalData.requestDate || '';
              if (index === 8) input.value = originalData.repairSchedule || '';
              if (index === 9) input.value = originalData.repairLocation || '';
            });
            
            // 繝・く繧ｹ繝医お繝ｪ繧｢縺ｮ蛟､繧定ｨｭ螳・
            textareas.forEach((textarea, index) => {
              if (index === 0) {
                textarea.value = originalData.problemDescription || originalData.description || originalData.incidentTitle || originalData.title || '';
              }
              if (index === 1) {
                textarea.value = originalData.notes || '';
              }
            });
          }
          
          function resetToOriginal() {
            // 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨ｒ蜈・・蛟､縺ｫ謌ｻ縺・
            setupEditFields();
          }
          
          async function saveReport() {
            console.log('菫晏ｭ伜・逅・幕蟋・);
            console.log('originalData:', originalData);
            console.log('originalData.id:', originalData.id);
            console.log('originalData.chatId:', originalData.chatId);
            console.log('originalData.reportId:', originalData.reportId);
            console.log('originalData.fileName:', originalData.fileName);
            
            // 邱ｨ髮・＆繧後◆繝・・繧ｿ繧貞庶髮・
            const updatedData = { ...originalData };
            
            // 蜷・・蜉帙ヵ繧｣繝ｼ繝ｫ繝峨°繧牙､繧貞叙蠕・
            const inputs = document.querySelectorAll('input.editable');
            const textareas = document.querySelectorAll('textarea.editable');
            
            console.log('蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝画焚:', inputs.length);
            console.log('繝・く繧ｹ繝医お繝ｪ繧｢謨ｰ:', textareas.length);
            
            // 蜈･蜉帙ヵ繧｣繝ｼ繝ｫ繝峨・蛟､繧貞叙蠕・
            inputs.forEach((input, index) => {
              if (index === 0) updatedData.reportId = input.value;
              if (index === 1) updatedData.machineType = input.value;
              if (index === 2) updatedData.machineNumber = input.value;
              if (index === 3) updatedData.date = input.value;
              if (index === 4) updatedData.location = input.value;
              if (index === 5) updatedData.status = input.value;
              if (index === 6) updatedData.engineer = input.value;
              if (index === 7) updatedData.requestDate = input.value;
              if (index === 8) updatedData.repairSchedule = input.value;
              if (index === 9) updatedData.repairLocation = input.value;
            });
            
            // 繝・く繧ｹ繝医お繝ｪ繧｢縺ｮ蛟､繧貞叙蠕・
            textareas.forEach((textarea, index) => {
              if (index === 0) {
                updatedData.problemDescription = textarea.value;
              }
              if (index === 1) {
                updatedData.notes = textarea.value;
              }
            });
            
            console.log('譖ｴ譁ｰ縺輔ｌ縺溘ョ繝ｼ繧ｿ:', updatedData);
            console.log('菴ｿ逕ｨ縺吶ｋchatId:', updatedData.chatId || updatedData.id);
            
            // 繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｫ菫晏ｭ・
            localStorage.setItem('savedMachineFailureReport_' + updatedData.id, JSON.stringify(updatedData));
            
            // 螻･豁ｴ繝・・繧ｿ繧呈峩譁ｰ・郁ｦｪ繧ｦ繧｣繝ｳ繝峨え縺ｮ螻･豁ｴ荳隕ｧ陦ｨ繧呈峩譁ｰ・・
            try {
              if (window.opener && !window.opener.closed) {
                // 隕ｪ繧ｦ繧｣繝ｳ繝峨え縺ｮ螻･豁ｴ繝・・繧ｿ繧呈峩譁ｰ
                window.opener.postMessage({
                  type: 'UPDATE_HISTORY_ITEM',
                  data: updatedData
                }, '*');
                
                // 隕ｪ繧ｦ繧｣繝ｳ繝峨え縺ｮ繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ繧よ峩譁ｰ
                try {
                  const parentStorage = window.opener.localStorage;
                  const historyKey = 'savedMachineFailureReport_' + updatedData.id;
                  parentStorage.setItem(historyKey, JSON.stringify(updatedData));
                } catch (storageError) {
                  console.warn('隕ｪ繧ｦ繧｣繝ｳ繝峨え縺ｮ繝ｭ繝ｼ繧ｫ繝ｫ繧ｹ繝医Ξ繝ｼ繧ｸ譖ｴ譁ｰ縺ｫ螟ｱ謨・', storageError);
                }
              }
            } catch (error) {
              console.warn('隕ｪ繧ｦ繧｣繝ｳ繝峨え縺ｸ縺ｮ騾夂衍縺ｫ螟ｱ謨・', error);
            }
            
            // 蜈・・繝・・繧ｿ繧呈峩譁ｰ
            originalData = updatedData;
            
            // UI繧呈峩譁ｰ
            updateUIAfterSave(updatedData);
            
            // 邱ｨ髮・Δ繝ｼ繝峨ｒ邨ゆｺ・
            toggleEditMode();
            
            // 謌仙粥繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
            alert('繝ｬ繝昴・繝医′菫晏ｭ倥＆繧後∪縺励◆縲ょｱ･豁ｴ繧｢繧､繝・Β繧よ峩譁ｰ縺輔ｌ縺ｾ縺吶・);
            
            // 繧ｵ繝ｼ繝舌・縺ｸ縺ｮ菫晏ｭ倥ｂ隧ｦ陦・
            try {
              await saveToJsonFile(updatedData);
            } catch (error) {
              console.warn('繧ｵ繝ｼ繝舌・縺ｸ縺ｮ菫晏ｭ倥・螟ｱ謨励＠縺ｾ縺励◆縺後√Ο繝ｼ繧ｫ繝ｫ縺ｫ縺ｯ菫晏ｭ倥＆繧後※縺・∪縺・', error);
            }
          }
          
          async function saveToJsonFile(updatedData) {
            try {
              console.log('繧ｵ繝ｼ繝舌・縺ｸ縺ｮ菫晏ｭ倬幕蟋・', updatedData);
              
              // 豁｣縺励＞ID繧貞叙蠕・
              let targetId = originalData.id || originalData.chatId || originalData.reportId;
              
              // ID縺悟叙蠕励〒縺阪↑縺・ｴ蜷医・縲√ヵ繧｡繧､繝ｫ蜷阪°繧蔚UID繧呈歓蜃ｺ
              if (!targetId && originalData.fileName) {
                console.log('繝輔ぃ繧､繝ｫ蜷阪°繧蔚UID謚ｽ蜃ｺ繧定ｩｦ陦・', originalData.fileName);
                
                // UUID繝代ち繝ｼ繝ｳ1: 讓呎ｺ也噪縺ｪUUID蠖｢蠑・
                let fileNameMatch = originalData.fileName.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
                
                if (fileNameMatch) {
                  targetId = fileNameMatch[1];
                  console.log('讓呎ｺ剖UID縺九ｉ謚ｽ蜃ｺ縺励◆ID:', targetId);
                } else {
                  // UUID繝代ち繝ｼ繝ｳ2: 繧｢繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢蛹ｺ蛻・ｊ縺ｮUUID
                  fileNameMatch = originalData.fileName.match(/_([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
                  if (fileNameMatch) {
                    targetId = fileNameMatch[1];
                    console.log('繧｢繝ｳ繝繝ｼ繧ｹ繧ｳ繧｢蛹ｺ蛻・ｊUUID縺九ｉ謚ｽ蜃ｺ縺励◆ID:', targetId);
                  }
                }
              }
              
              if (!targetId) {
                console.error('蟇ｾ雎｡ID縺檎音螳壹〒縺阪∪縺帙ｓ:', originalData);
                throw new Error('蟇ｾ雎｡ID縺檎音螳壹〒縺阪∪縺帙ｓ');
              }
              
              console.log('菫晏ｭ伜ｯｾ雎｡ID:', targetId);
              
              // 譖ｴ譁ｰ繝・・繧ｿ縺ｮ貅門ｙ
              const updatePayload = {
                updatedData: updatedData,
                updatedBy: 'user'
              };
              
              console.log('騾∽ｿ｡縺吶ｋ繝壹う繝ｭ繝ｼ繝・', updatePayload);
              
              // 繧ｵ繝ｼ繝舌・API繧貞他縺ｳ蜃ｺ縺励※螻･豁ｴ繧｢繧､繝・Β繧呈峩譁ｰ
              const response = await fetch('/api/history/update-item/' + targetId, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatePayload)
              });
              
              console.log('繧ｵ繝ｼ繝舌・繝ｬ繧ｹ繝昴Φ繧ｹ:', response.status, response.statusText);
              console.log('繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ:', Object.fromEntries(response.headers.entries()));
              
              if (response.ok) {
                const result = await response.json();
                console.log('螻･豁ｴ繝輔ぃ繧､繝ｫ縺梧ｭ｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆:', result);
                
                // 謌仙粥繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
                alert('繝ｬ繝昴・繝医′蜈・・繝輔ぃ繧､繝ｫ縺ｫ豁｣蟶ｸ縺ｫ荳頑嶌縺堺ｿ晏ｭ倥＆繧後∪縺励◆縲・);
                
                return result;
              } else {
                const errorData = await response.json();
                console.error('繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ:', errorData);
                throw new Error(errorData.error || '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ: ' + response.status);
              }
              
            } catch (error) {
              console.error('JSON繝輔ぃ繧､繝ｫ菫晏ｭ倥お繝ｩ繝ｼ:', error);
              throw error;
            }
          }
                    engineer: updatedData.engineer,
                    location: updatedData.location,
                    requestDate: updatedData.requestDate,
                    repairSchedule: updatedData.repairSchedule,
                    repairLocation: updatedData.repairLocation,
                    lastModified: new Date().toISOString()
                  },
                  updatedBy: 'user'
                })
              });
              
              console.log('繧ｵ繝ｼ繝舌・繝ｬ繧ｹ繝昴Φ繧ｹ:', response.status, response.statusText);
              console.log('繝ｬ繧ｹ繝昴Φ繧ｹ繝倥ャ繝繝ｼ:', Object.fromEntries(response.headers.entries()));
              
              if (response.ok) {
                try {
                  const result = await response.json();
                  console.log('螻･豁ｴ繧｢繧､繝・Β縺梧ｭ｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆:', result);
                  
                  // 菫晏ｭ俶・蜉溷ｾ後・蜃ｦ逅・
                  updateUIAfterSave(updatedData);
                  
                  // 謌仙粥繝｡繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ
                  alert('螻･豁ｴ繧｢繧､繝・Β縺梧ｭ｣蟶ｸ縺ｫ譖ｴ譁ｰ縺輔ｌ縺ｾ縺励◆縲・);
                } catch (parseError) {
                  console.warn('繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ隗｣譫舌↓螟ｱ謨励＠縺ｾ縺励◆縺後∽ｿ晏ｭ倥・謌仙粥縺励※縺・∪縺・', parseError);
                  updateUIAfterSave(updatedData);
                  alert('螻･豁ｴ繧｢繧､繝・Β縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆縲・);
                }
              } else {
                let errorMessage = '繧ｵ繝ｼ繝舌・繧ｨ繝ｩ繝ｼ';
                try {
                  // 繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮContent-Type繧堤｢ｺ隱・
                  const contentType = response.headers.get('content-type');
                  if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    console.error('繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ隧ｳ邏ｰ:', errorData);
                    if (errorData.error) {
                      errorMessage = errorData.error;
                    } else if (errorData.message) {
                      errorMessage = errorData.message;
                    } else {
                      errorMessage = 'HTTP ' + response.status + ': ' + response.statusText;
                    }
                  } else {
                    // HTML繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ蝣ｴ蜷・
                    const textResponse = await response.text();
                    console.error('HTML繝ｬ繧ｹ繝昴Φ繧ｹ:', textResponse.substring(0, 200));
                    errorMessage = 'HTTP ' + response.status + ': ' + response.statusText + ' (HTML繝ｬ繧ｹ繝昴Φ繧ｹ)';
                  }
                } catch (parseError) {
                  console.error('繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ縺ｮ隗｣譫舌↓螟ｱ謨・', parseError);
                  errorMessage = 'HTTP ' + response.status + ': ' + response.statusText;
                }
                
                console.error('螻･豁ｴ繧｢繧､繝・Β縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', errorMessage);
                alert('螻･豁ｴ繧｢繧､繝・Β縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ' + errorMessage);
              }
            } catch (error) {
              console.error('菫晏ｭ倥お繝ｩ繝ｼ:', error);
              console.error('繧ｨ繝ｩ繝ｼ繧ｹ繧ｿ繝・け:', error.stack);
              alert('菫晏ｭ倅ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ' + error.message);
            }
          }
          
          function updateUIAfterSave(updatedData) {
            // 菫晏ｭ伜ｾ後↓UI繧呈峩譁ｰ
            const readonlyElements = document.querySelectorAll('.readonly');
            
            // 蝣ｱ蜻頑嶌ID
            if (readonlyElements[0]) {
              readonlyElements[0].textContent = (updatedData.reportId || updatedData.id || '').substring(0, 8) + '...';
            }
            
            // 讖溽ｨｮ
            if (readonlyElements[1]) {
              readonlyElements[1].textContent = updatedData.machineType || updatedData.machineTypeName || '-';
            }
            
            // 讖滓｢ｰ逡ｪ蜿ｷ
            if (readonlyElements[2]) {
              readonlyElements[2].textContent = updatedData.machineNumber || '-';
            }
            
            // 譌･莉・
            if (readonlyElements[3]) {
              const dateValue = updatedData.date || updatedData.timestamp || updatedData.createdAt;
              if (dateValue) {
                const date = new Date(dateValue);
                readonlyElements[3].textContent = date.toLocaleDateString('ja-JP');
              } else {
                readonlyElements[3].textContent = '-';
              }
            }
            
            // 蝣ｴ謇
            if (readonlyElements[4]) {
              readonlyElements[4].textContent = updatedData.location || '-';
            }
            
            // 繧ｹ繝・・繧ｿ繧ｹ
            if (readonlyElements[5]) {
              readonlyElements[5].textContent = updatedData.status || '-';
            }
            
            // 雋ｬ莉ｻ閠・
            if (readonlyElements[6]) {
              readonlyElements[6].textContent = updatedData.engineer || '-';
            }
            
            // 隱ｬ譏・
            if (readonlyElements[7]) {
              readonlyElements[7].textContent = updatedData.problemDescription || updatedData.description || updatedData.incidentTitle || updatedData.title || '隱ｬ譏弱↑縺・;
            }
            
            // 蛯呵・
            if (readonlyElements[8]) {
              readonlyElements[8].textContent = updatedData.notes || '-';
            }
            
            // 萓晞ｼ譛域律
            if (readonlyElements[9]) {
              readonlyElements[9].textContent = updatedData.requestDate || '-';
            }
            
            // 莠亥ｮ壽怦譌･
            if (readonlyElements[10]) {
              readonlyElements[10].textContent = updatedData.repairSchedule || '-';
            }
            
            // 菫ｮ郢募ｴ謇
            if (readonlyElements[11]) {
              readonlyElements[11].textContent = updatedData.repairLocation || '-';
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  // 逕ｻ蜒丞叙蠕励・蜈ｱ騾夐未謨ｰ・育ｷｨ髮・ｯｾ雎｡繝輔ぃ繧､繝ｫ蜀・・縺ｿ縺ｧ螳檎ｵ撰ｼ・
  function pickFirstImage(data: any): string | null {
    // 1) 逶ｴ荳・or 繝阪せ繝磯・蛻励↓ dataURL 縺後≠繧後・蜆ｪ蜈・
    const dig = (v:any): string | null => {
      if (!v) return null;
      if (typeof v === 'string' && v.startsWith('data:image/')) return v;
      if (Array.isArray(v)) for (const x of v) { const r = dig(x); if (r) return r; }
      if (typeof v === 'object') for (const k of Object.keys(v)) { const r = dig(v[k]); if (r) return r; }
      return null;
    };
    const fromDataUrl = dig(data);
    if (fromDataUrl) return fromDataUrl;

    // 2) savedImages
    const saved = data?.savedImages;
    if (Array.isArray(saved) && saved[0]) return saved[0];

    // 3) imagePath(URL)
    if (typeof data?.imagePath === 'string') return data.imagePath;

    return null;
  }

  // 蜊ｰ蛻ｷ逕ｨCSS
  const PRINT_STYLES = `
<style>
  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    html, body { margin: 0; padding: 0; }
    .no-print, .print:hidden { display: none !important; }
    img, .image-cell, .image-section { page-break-inside: avoid; break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top; }
  }
  /* 逕ｻ髱｢繝励Ξ繝薙Η繝ｼ逕ｨ・壼魂蛻ｷ蟆ら畑繧ｦ繧｣繝ｳ繝峨え縺ｧ縺ｯ譛蟆城剞縺ｧOK */
  img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
  .report-img { max-width: 100%; height: auto; }
</style>
`;

  // 荳隕ｧ蜊ｰ蛻ｷ逕ｨHTML逕滓・
  const generateListPrintHTML = (items: any[]): string => {
    const rows = items.map(item => {
      const imageUrl = pickFirstImage(item);
      const imageCell = imageUrl 
        ? `<img class="thumb" src="${imageUrl}" alt="逕ｻ蜒・ />`
        : '-';
      
      return `
        <tr>
          <td>${item.title || item.incidentTitle || '繧ｿ繧､繝医Ν縺ｪ縺・}</td>
          <td>${item.machineType || item.machineTypeName || '-'}</td>
          <td>${item.machineNumber || '-'}</td>
          <td>${item.date || item.timestamp || '-'}</td>
          <td>${item.status || '-'}</td>
          <td>${imageCell}</td>
        </tr>
      `;
    }).join('');

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>謨・囿荳隕ｧ蜊ｰ蛻ｷ</title>
        ${PRINT_STYLES}
      </head>
      <body>
        <h1>謨・囿荳隕ｧ</h1>
        <table>
          <thead>
            <tr>
              <th>繧ｿ繧､繝医Ν</th>
              <th>讖溽ｨｮ</th>
              <th>讖滓｢ｰ逡ｪ蜿ｷ</th>
              <th>譌･莉・/th>
              <th>繧ｹ繝・・繧ｿ繧ｹ</th>
              <th>逕ｻ蜒・/th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;
  };

  // 荳隕ｧ蜊ｰ蛻ｷ螳溯｡・
  const printList = (items: any[]) => {
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return;
    
    const contentHTML = generateListPrintHTML(items);
    w.document.write(contentHTML);
    w.document.close();
    
    // 蜊ｰ蛻ｷ繝繧､繧｢繝ｭ繧ｰ繧定｡ｨ遉ｺ
    setTimeout(() => {
      w.print();
    }, 100);
  };



  // 蜊ｰ蛻ｷ讖溯・
  const handlePrintTable = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // 驕ｸ謚槭＆繧後◆螻･豁ｴ縺ｮ縺ｿ繧貞魂蛻ｷ蟇ｾ雎｡縺ｨ縺吶ｋ
    const targetItems = selectedItems.size > 0 
      ? filteredItems.filter(item => selectedItems.has(item.id))
      : filteredItems;

    const tableContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>螻･豁ｴ荳隕ｧ - 蜊ｰ蛻ｷ</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          @media print {
            html, body { margin: 0; padding: 0; }
            .no-print { display: none !important; }
            img, .image-cell { break-inside: avoid; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #ccc; padding: 4px; vertical-align: top; }
          }
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #333; }
          .header p { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .summary { margin-bottom: 20px; padding: 10px; background-color: #f9f9f9; border-radius: 5px; }
          .image-cell img { max-width: 100px; max-height: 100px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; display: block; margin: 0 auto; }
          .image-cell { text-align: center; vertical-align: middle; }
          img.thumb { width: 32px; height: 32px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>讖滓｢ｰ謨・囿螻･豁ｴ荳隕ｧ</h1>
          <p>蜊ｰ蛻ｷ譌･譎・ ${new Date().toLocaleString('ja-JP')}</p>
          <p>蟇ｾ雎｡莉ｶ謨ｰ: ${targetItems.length}莉ｶ${selectedItems.size > 0 ? ' (驕ｸ謚槭＆繧後◆螻･豁ｴ)' : ''}</p>
        </div>
        
        <div class="summary">
          <strong>蜊ｰ蛻ｷ蟇ｾ雎｡:</strong> ${selectedItems.size > 0 ? '驕ｸ謚槭＆繧後◆螻･豁ｴ' : '讖滓｢ｰ謨・囿螻･豁ｴ荳隕ｧ'}<br>
          <strong>蜊ｰ蛻ｷ譌･譎・</strong> ${new Date().toLocaleString('ja-JP')}<br>
          <strong>蟇ｾ雎｡莉ｶ謨ｰ:</strong> ${targetItems.length}莉ｶ
        </div>
        
        <table>
          <thead>
            <tr>
              <th>讖溽ｨｮ</th>
              <th>讖滓｢ｰ逡ｪ蜿ｷ</th>
              <th>莠玖ｱ｡</th>
              <th>隱ｬ譏・/th>
              <th>菴懈・譌･譎・/th>
              <th>逕ｻ蜒・/th>
            </tr>
          </thead>
          <tbody>
            ${targetItems.map((item) => {
              const jsonData = item.jsonData;
              const machineType = jsonData?.machineType || 
                                jsonData?.originalChatData?.machineInfo?.machineTypeName ||
                                jsonData?.chatData?.machineInfo?.machineTypeName || 
                                item.machineType || '';
              const machineNumber = jsonData?.machineNumber || 
                                  jsonData?.originalChatData?.machineInfo?.machineNumber ||
                                  jsonData?.chatData?.machineInfo?.machineNumber || 
                                  item.machineNumber || '';
              const incidentTitle = jsonData?.title || jsonData?.question || '莠玖ｱ｡縺ｪ縺・;
              const problemDescription = jsonData?.problemDescription || jsonData?.answer || '隱ｬ譏弱↑縺・;
              
              // pickFirstImage髢｢謨ｰ繧剃ｽｿ逕ｨ縺励※逕ｻ蜒酋RL繧貞叙蠕・
              const imageUrl = pickFirstImage(item);
              
              return `
                <tr>
                  <td>${machineType}</td>
                  <td>${machineNumber}</td>
                  <td>${incidentTitle}</td>
                  <td>${problemDescription}</td>
                  <td>${formatDate(item.createdAt)}</td>
                  <td class="image-cell">${imageUrl ? `<img class="thumb" src="${imageUrl}" alt="謨・囿逕ｻ蜒・ onerror="this.style.display='none'; this.nextSibling.style.display='inline';" /><span style="display:none; color: #999; font-size: 10px;">逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ</span>` : '縺ｪ縺・}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.close()">髢峨§繧・/button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(tableContent);
    printWindow.document.close();
    
    // 蜊ｰ蛻ｷ繝繧､繧｢繝ｭ繧ｰ繧定・蜍慕噪縺ｫ陦ｨ遉ｺ
    setTimeout(() => {
      printWindow.print();
    }, 100);
  };

  const handlePrintReport = (item: SupportHistoryItem) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const jsonData = item.jsonData;
    
    // 莠玖ｱ｡繝・・繧ｿ繧呈歓蜃ｺ・医ヵ繧｡繧､繝ｫ蜷阪°繧牙━蜈育噪縺ｫ蜿門ｾ励∵ｬ｡縺ｫJSON繝・・繧ｿ縺九ｉ・・
    let incidentTitle = '莠玖ｱ｡縺ｪ縺・;
    
    // 縺ｾ縺壹ヵ繧｡繧､繝ｫ蜷阪°繧我ｺ玖ｱ｡蜀・ｮｹ繧呈歓蜃ｺ
    if (item.fileName) {
      const fileNameParts = item.fileName.split('_');
      if (fileNameParts.length > 1) {
        // 繝輔ぃ繧､繝ｫ蜷阪・譛蛻昴・驛ｨ蛻・′莠玖ｱ｡蜀・ｮｹ
        incidentTitle = fileNameParts[0];
      }
    }
    
    // 繝輔ぃ繧､繝ｫ蜷阪°繧牙叙蠕励〒縺阪↑縺・ｴ蜷医・縲゛SON繝・・繧ｿ縺九ｉ蜿門ｾ・
    if (incidentTitle === '莠玖ｱ｡縺ｪ縺・) {
      incidentTitle = jsonData?.title || jsonData?.question || '莠玖ｱ｡縺ｪ縺・;
      if (incidentTitle === '莠玖ｱ｡縺ｪ縺・ && jsonData?.chatData?.messages) {
        // 蠕捺擂繝輔か繝ｼ繝槭ャ繝医・蝣ｴ蜷医√Θ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺九ｉ莠玖ｱ｡繧呈歓蜃ｺ
        const userMessages = jsonData.chatData.messages.filter((msg: any) => !msg.isAiResponse);
        if (userMessages.length > 0) {
          // 譛蛻昴・繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧剃ｺ玖ｱ｡縺ｨ縺励※菴ｿ逕ｨ
          incidentTitle = userMessages[0].content || '莠玖ｱ｡縺ｪ縺・;
        }
      }
    }
    
    const problemDescription = jsonData?.problemDescription || jsonData?.answer || '隱ｬ譏弱↑縺・;
    
    // 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ繧呈歓蜃ｺ・・PI縺九ｉ霑斐＆繧後ｋ繝・・繧ｿ讒矩縺ｫ蜷医ｏ縺帙ｋ・・
    const machineType = item.machineInfo?.machineTypeName || 
                      jsonData?.machineType || 
                      jsonData?.chatData?.machineInfo?.machineTypeName || 
                      item.machineType || '';
    const machineNumber = item.machineInfo?.machineNumber || 
                        jsonData?.machineNumber || 
                        jsonData?.chatData?.machineInfo?.machineNumber || 
                        item.machineNumber || '';
    
    const extractedComponents = jsonData?.extractedComponents || [];
    const extractedSymptoms = jsonData?.extractedSymptoms || [];
    const possibleModels = jsonData?.possibleModels || [];
    
    // 逕ｻ蜒酋RL繧貞叙蠕暦ｼ亥━蜈磯・ｽ堺ｻ倥″・・
    let imageUrl = '';
    let imageFileName = '';
    
    console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ蜃ｦ逅・', {
      itemId: item.id,
      hasJsonData: !!jsonData,
      jsonDataKeys: jsonData ? Object.keys(jsonData) : [],
      savedImages: jsonData?.savedImages,
      conversationHistory: jsonData?.conversationHistory,
      originalChatData: jsonData?.originalChatData,
      chatData: jsonData?.chatData,
      imagePath: item.imagePath
    });
    
    // 蜆ｪ蜈磯・ｽ・: conversationHistory縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ暦ｼ域怙蜆ｪ蜈茨ｼ・
    if (jsonData?.conversationHistory && jsonData.conversationHistory.length > 0) {
      const imageMessage = jsonData.conversationHistory.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `謨・囿逕ｻ蜒柔${item.id}`;
        console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: conversationHistory縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ暦ｼ域怙蜆ｪ蜈茨ｼ・);
      }
    }
    
    // 蜆ｪ蜈磯・ｽ・: originalChatData.messages縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ・
    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `謨・囿逕ｻ蜒柔${item.id}`;
        console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: originalChatData縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ暦ｼ亥━蜈磯・ｽ・・・);
      }
    }
    
    // 蜆ｪ蜈磯・ｽ・: chatData.messages縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ・
    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `謨・囿逕ｻ蜒柔${item.id}`;
        console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: chatData縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ暦ｼ亥━蜈磯・ｽ・・・);
      }
    }
    
    // 蜆ｪ蜈磯・ｽ・: 逶ｴ謗･縺ｮmessages繝輔ぅ繝ｼ繝ｫ繝峨°繧隠ase64逕ｻ蜒上ｒ讀懃ｴ｢
    if (!imageUrl && jsonData?.messages && Array.isArray(jsonData.messages)) {
      const imageMessage = jsonData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `謨・囿逕ｻ蜒柔${item.id}`;
        console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: messages繝輔ぅ繝ｼ繝ｫ繝峨°繧隠ase64逕ｻ蜒上ｒ蜿門ｾ暦ｼ亥━蜈磯・ｽ・・・);
      }
    }
    
    // 蜆ｪ蜈磯・ｽ・: savedImages縺九ｉ逕ｻ蜒上ｒ蜿門ｾ暦ｼ医し繝ｼ繝舌・荳翫・繝輔ぃ繧､繝ｫ・・
    if (!imageUrl && jsonData?.savedImages && jsonData.savedImages.length > 0) {
      const savedImage = jsonData.savedImages[0];
      imageUrl = savedImage.url || '';
      imageFileName = savedImage.fileName || `謨・囿逕ｻ蜒柔${item.id}`;
      console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: savedImages縺九ｉ逕ｻ蜒上ｒ蜿門ｾ暦ｼ亥━蜈磯・ｽ・・・);
    }
    
    // 蜆ｪ蜈磯・ｽ・: originalChatData.messages縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ・
    if (!imageUrl && jsonData?.originalChatData?.messages) {
      const imageMessage = jsonData.originalChatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `謨・囿逕ｻ蜒柔${item.id}`;
        console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: originalChatData縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ暦ｼ亥━蜈磯・ｽ・・・);
      }
    }
    
    // 蜆ｪ蜈磯・ｽ・: 蠕捺擂繝輔か繝ｼ繝槭ャ繝医・chatData.messages縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ・
    if (!imageUrl && jsonData?.chatData?.messages) {
      const imageMessage = jsonData.chatData.messages.find((msg: any) => 
        msg.content && msg.content.startsWith('data:image/')
      );
      if (imageMessage) {
        imageUrl = imageMessage.content;
        imageFileName = `謨・囿逕ｻ蜒柔${item.id}`;
        console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: chatData縺九ｉBase64逕ｻ蜒上ｒ蜿門ｾ暦ｼ亥━蜈磯・ｽ・・・);
      }
    }
    
    // 蜆ｪ蜈磯・ｽ・: 縺昴・莉悶・蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ繝輔ぅ繝ｼ繝ｫ繝峨°繧臥判蜒上ｒ讀懃ｴ｢
    if (!imageUrl) {
      // 逕ｻ蜒上ョ繝ｼ繧ｿ縺悟性縺ｾ繧後ｋ蜿ｯ閭ｽ諤ｧ縺ｮ縺ゅｋ繝輔ぅ繝ｼ繝ｫ繝峨ｒ蜀榊ｸｰ逧・↓讀懃ｴ｢
      const findImagesRecursively = (obj: any, path: string = ''): any[] => {
        const foundImages = [];
        if (obj && typeof obj === 'object') {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (typeof value === 'string' && value.startsWith('data:image/')) {
              foundImages.push({
                path: currentPath,
                content: value
              });
            } else if (Array.isArray(value)) {
              value.forEach((item, index) => {
                foundImages.push(...findImagesRecursively(item, `${currentPath}[${index}]`));
              });
            } else if (typeof value === 'object' && value !== null) {
              foundImages.push(...findImagesRecursively(value, currentPath));
            }
          }
        }
        return foundImages;
      };
      
      const recursiveImages = findImagesRecursively(jsonData);
      if (recursiveImages.length > 0) {
        imageUrl = recursiveImages[0].content;
        imageFileName = `謨・囿逕ｻ蜒柔${item.id}`;
        console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: 蜀榊ｸｰ逧・､懃ｴ｢縺ｧ逕ｻ蜒上ｒ蜿門ｾ暦ｼ亥━蜈磯・ｽ・・・);
      }
    }
    
    // 蜆ｪ蜈磯・ｽ・: 蠕捺擂縺ｮimagePath繝輔ぅ繝ｼ繝ｫ繝会ｼ域怙邨ゅヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ・・
    if (!imageUrl && item.imagePath) {
      imageUrl = item.imagePath.startsWith('http') ? item.imagePath : 
               item.imagePath.startsWith('/') ? `${window.location.origin}${item.imagePath}` :
               `${window.location.origin}/api/images/chat-exports/${item.imagePath}`;
      imageFileName = `謨・囿逕ｻ蜒柔${item.id}`;
      console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: imagePath縺九ｉ逕ｻ蜒上ｒ蜿門ｾ暦ｼ域怙邨ゅヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ・・);
    }
    
    console.log('蛟句挨繝ｬ繝昴・繝亥魂蛻ｷ逕ｨ: 譛邨ら噪縺ｪ逕ｻ蜒乗ュ蝣ｱ:', {
      hasImage: !!imageUrl,
      imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : '縺ｪ縺・,
      imageFileName,
      isBase64: imageUrl ? imageUrl.startsWith('data:image/') : false
    });
    
    const reportContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌 - 蜊ｰ蛻ｷ</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .header h1 { margin: 0; color: #333; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; }
          .section { margin-bottom: 25px; }
          .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-item { padding: 10px; background-color: #f9f9f9; border-radius: 5px; }
          .info-item strong { display: block; margin-bottom: 5px; color: #333; }
          .content-box { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 10px; }
          .image-section { text-align: center; margin: 20px 0; }
          .image-section img { max-width: 100%; max-height: 300px; border: 1px solid #ddd; border-radius: 5px; }
          @media print {
            .no-print { display: none; }
            body { 
              margin: 0; 
              font-size: 10px;
              line-height: 1.2;
            }
            .header h1 { 
              font-size: 16px; 
              margin: 5px 0; 
            }
            .header p { 
              font-size: 8px; 
              margin: 2px 0; 
            }
            .section { 
              margin: 8px 0; 
              page-break-inside: avoid;
            }
            .section h2 { 
              font-size: 12px; 
              margin: 5px 0; 
            }
            .info-grid { 
              gap: 4px; 
            }
            .info-item { 
              font-size: 9px; 
              padding: 2px; 
            }
            .content { 
              font-size: 9px; 
              line-height: 1.1;
            }
            .image-section { 
              margin: 8px 0; 
            }
            .image-section img { 
              max-height: 150px; 
            }
            @page {
              size: A4;
              margin: 10mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
                      <h1>讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌</h1>
          <p>蜊ｰ蛻ｷ譌･譎・ ${new Date().toLocaleString('ja-JP')}</p>
        </div>
        
        <div class="section">
          <h2>蝣ｱ蜻頑ｦりｦ・/h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>蝣ｱ蜻頑嶌ID</strong>
              R${item.id.slice(-5).toUpperCase()}
            </div>
            <div class="info-item">
              <strong>讖滓｢ｰID</strong>
              ${item.machineNumber}
            </div>
            <div class="info-item">
              <strong>譌･莉・/strong>
              ${new Date(item.createdAt).toISOString().split('T')[0]}
            </div>
            <div class="info-item">
              <strong>蝣ｴ謇</strong>
              笳銀雷邱・
            </div>
            <div class="info-item">
              <strong>謨・囿繧ｳ繝ｼ繝・/strong>
              FC01
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>莠玖ｱ｡隧ｳ邏ｰ</h2>
          <div class="content-box">
            <p><strong>莠玖ｱ｡繧ｿ繧､繝医Ν:</strong> ${incidentTitle}</p>
            <p><strong>莠玖ｱ｡隱ｬ譏・</strong> ${problemDescription}</p>
            <p><strong>繧ｹ繝・・繧ｿ繧ｹ:</strong> 蠢懈･蜃ｦ鄂ｮ螳御ｺ・/p>
            <p><strong>諡・ｽ薙お繝ｳ繧ｸ繝九い:</strong> 諡・ｽ楢・/p>
            <p><strong>讖溽ｨｮ:</strong> ${machineType}</p>
            <p><strong>讖滓｢ｰ逡ｪ蜿ｷ:</strong> ${machineNumber}</p>
          </div>
        </div>
        
        ${imageUrl ? `
        <div class="section">
          <h2>謨・囿邂・園逕ｻ蜒・/h2>
          <div class="image-section">
            <p>讖滓｢ｰ謨・囿邂・園縺ｮ逕ｻ蜒・/p>
            <img src="${imageUrl}" alt="謨・囿邂・園逕ｻ蜒・ />
            <p style="font-size: 12px; color: #666;">荳願ｨ倥・謨・囿邂・園縺ｮ蜀咏悄縺ｧ縺吶・/p>
          </div>
        </div>
        ` : ''}
        
        <div class="section">
          <h2>菫ｮ郢戊ｨ育判</h2>
          <div class="info-grid">
            <div class="info-item">
              <strong>莠亥ｮ壽怦譌･</strong>
              ${item.jsonData?.repairSchedule || '-'}
            </div>
            <div class="info-item">
              <strong>蝣ｴ謇</strong>
              ${item.jsonData?.location || '-'}
            </div>
          </div>
        </div>
        
        <div class="section">
          <h2>險倅ｺ区ｬ・/h2>
          <div class="content-box">
            <p>${item.jsonData?.remarks || '險倩ｼ峨↑縺・}</p>
          </div>
        </div>
        
        <div class="section">
          <p style="text-align: center; color: #666; font-size: 12px;">
            ﾂｩ 2025 讖滓｢ｰ謨・囿蝣ｱ蜻頑嶌. All rights reserved.
          </p>
        </div>
        
        <div class="no-print" style="margin-top: 30px; text-align: center;">
          <button onclick="window.print()">蜊ｰ蛻ｷ</button>
          <button onclick="window.close()">髢峨§繧・/button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(reportContent);
    printWindow.document.close();
  };

  // 繝ｭ繝ｼ繝・ぅ繝ｳ繧ｰ迥ｶ諷九・陦ｨ遉ｺ
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">螻･豁ｴ繝・・繧ｿ繧定ｪｭ縺ｿ霎ｼ縺ｿ荳ｭ...</p>
          </div>
        </div>
      </div>
    );
  }

  // 繝｡繧､繝ｳ繧ｳ繝ｳ繝・Φ繝・・陦ｨ遉ｺ
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">螻･豁ｴ邂｡逅・/h1>
        <p className="text-gray-600">騾∽ｿ｡縺輔ｌ縺溘ョ繝ｼ繧ｿ縺ｨ髢｢騾｣逕ｻ蜒上・螻･豁ｴ繧堤ｮ｡逅・・讀懃ｴ｢縺ｧ縺阪∪縺・/p>
      </div>

      {/* 讀懃ｴ｢繝ｻ繝輔ぅ繝ｫ繧ｿ繧ｨ繝ｪ繧｢ */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            讀懃ｴ｢繝輔ぅ繝ｫ繧ｿ繝ｼ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* 繝・く繧ｹ繝域､懃ｴ｢ */}
            <div className="lg:col-span-2">
              <div className="space-y-2">
                <Input
                  placeholder="繧ｿ繧､繝医Ν縲∵ｩ溽ｨｮ縲∽ｺ区･ｭ謇縲∝ｿ懈･蜃ｦ鄂ｮ蜀・ｮｹ縲√く繝ｼ繝ｯ繝ｼ繝峨↑縺ｩ縺ｧ讀懃ｴ｢..."
                  value={filters.searchText}
                  onChange={(e) => handleFilterChange('searchText', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  窶ｻ 隍・焚縺ｮ繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ繧ｹ繝壹・繧ｹ蛹ｺ蛻・ｊ縺ｧ蜈･蜉帙☆繧九→縲√☆縺ｹ縺ｦ縺ｮ繧ｭ繝ｼ繝ｯ繝ｼ繝峨ｒ蜷ｫ繧螻･豁ｴ繧呈､懃ｴ｢縺励∪縺・
                </p>
              </div>
            </div>

            {/* 譌･莉俶､懃ｴ｢ */}
            <div>
              <div className="space-y-2">
                <Input
                  type="date"
                  value={filters.searchDate}
                  onChange={(e) => handleFilterChange('searchDate', e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  窶ｻ 謖・ｮ壹＠縺滓律莉倥・螻･豁ｴ繧呈､懃ｴ｢縺励∪縺・
                </p>
              </div>
            </div>

            {/* 讖溽ｨｮ繝輔ぅ繝ｫ繧ｿ */}
            <div>
              <div className="space-y-2">
                <Select
                  value={filters.machineType || "all"}
                  onValueChange={(value) => handleFilterChange('machineType', value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="讖溽ｨｮ繧帝∈謚・ />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">縺吶∋縺ｦ縺ｮ讖溽ｨｮ</SelectItem>
                    {searchFilterLoading ? (
                      <SelectItem value="loading" disabled>隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</SelectItem>
                    ) : searchFilterData.machineTypes && searchFilterData.machineTypes.length > 0 ? (
                      searchFilterData.machineTypes.map((type, index) => (
                        <SelectItem key={`type-${index}`} value={type}>
                          {type}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>繝・・繧ｿ縺後≠繧翫∪縺帙ｓ</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  窶ｻ JSON繝輔ぃ繧､繝ｫ縺九ｉ讖溽ｨｮ繧貞叙蠕励＠縺ｦ縺・∪縺・
                  {searchFilterData.machineTypes && ` (${searchFilterData.machineTypes.length}莉ｶ)`}
                </p>
              </div>
            </div>

            {/* 讖滓｢ｰ逡ｪ蜿ｷ繝輔ぅ繝ｫ繧ｿ */}
            <div>
              <div className="space-y-2">
                <Select
                  value={filters.machineNumber || "all"}
                  onValueChange={(value) => handleFilterChange('machineNumber', value === "all" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="讖滓｢ｰ逡ｪ蜿ｷ繧帝∈謚・ />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">縺吶∋縺ｦ縺ｮ讖滓｢ｰ逡ｪ蜿ｷ</SelectItem>
                    {searchFilterLoading ? (
                      <SelectItem value="loading" disabled>隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</SelectItem>
                    ) : searchFilterData.machineNumbers && searchFilterData.machineNumbers.length > 0 ? (
                      searchFilterData.machineNumbers.map((number, index) => (
                        <SelectItem key={`number-${index}`} value={number}>
                          {number}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>繝・・繧ｿ縺後≠繧翫∪縺帙ｓ</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  窶ｻ JSON繝輔ぃ繧､繝ｫ縺九ｉ讖滓｢ｰ逡ｪ蜿ｷ繧貞叙蠕励＠縺ｦ縺・∪縺・
                  {searchFilterData.machineNumbers && ` (${searchFilterData.machineNumbers.length}莉ｶ)`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              讀懃ｴ｢
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              繝輔ぅ繝ｫ繧ｿ繝ｼ繧ｯ繝ｪ繧｢
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 螻･豁ｴ荳隕ｧ */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              讖滓｢ｰ謨・囿螻･豁ｴ荳隕ｧ ({filteredItems.length}莉ｶ)
            </div>

          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredItems.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">螻･豁ｴ繝・・繧ｿ縺後≠繧翫∪縺帙ｓ</p>
            </div>
          ) : (
            // 繝・・繝悶Ν蠖｢蠑剰｡ｨ遉ｺ
            <div className="space-y-4">


              {/* 繝・・繝悶Ν */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-center text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                          onChange={handleSelectAll}
                          className="mr-2 w-6 h-6"
                        />
                        驕ｸ謚・
                      </th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">讖溽ｨｮ</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">讖滓｢ｰ逡ｪ蜿ｷ</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">莠玖ｱ｡蜀・ｮｹ</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">隱ｬ譏・繧ｨ繧ｯ繧ｹ繝昴・繝育ｨｮ蛻･</th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">菴懈・譌･譎・/th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">逕ｻ蜒・/th>
                      <th className="border border-gray-300 px-3 py-2 text-left text-sm font-medium">繧｢繧ｯ繧ｷ繝ｧ繝ｳ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      // 譁ｰ縺励＞繝輔か繝ｼ繝槭ャ繝医・繝・・繧ｿ讒矩縺ｫ蜷医ｏ縺帙※陦ｨ遉ｺ
                      const jsonData = item.jsonData;
                      
                      // 莠玖ｱ｡繝・・繧ｿ繧呈歓蜃ｺ・医ヵ繧｡繧､繝ｫ蜷阪°繧牙━蜈育噪縺ｫ蜿門ｾ励∵ｬ｡縺ｫJSON繝・・繧ｿ縺九ｉ・・
                      let incidentTitle = '莠玖ｱ｡縺ｪ縺・;
                      
                      // 縺ｾ縺壹ヵ繧｡繧､繝ｫ蜷阪°繧我ｺ玖ｱ｡蜀・ｮｹ繧呈歓蜃ｺ
                      if (item.fileName) {
                        const fileNameParts = item.fileName.split('_');
                        if (fileNameParts.length > 1) {
                          // 繝輔ぃ繧､繝ｫ蜷阪・譛蛻昴・驛ｨ蛻・′莠玖ｱ｡蜀・ｮｹ
                          incidentTitle = fileNameParts[0];
                        }
                      }
                      
                      // 繝輔ぃ繧､繝ｫ蜷阪°繧牙叙蠕励〒縺阪↑縺・ｴ蜷医・縲゛SON繝・・繧ｿ縺九ｉ蜿門ｾ・
                      if (incidentTitle === '莠玖ｱ｡縺ｪ縺・) {
                        incidentTitle = jsonData?.title || jsonData?.question || '莠玖ｱ｡縺ｪ縺・;
                        if (incidentTitle === '莠玖ｱ｡縺ｪ縺・ && jsonData?.chatData?.messages) {
                          // 蠕捺擂繝輔か繝ｼ繝槭ャ繝医・蝣ｴ蜷医√Θ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ縺九ｉ莠玖ｱ｡繧呈歓蜃ｺ
                          const userMessages = jsonData.chatData.messages.filter((msg: any) => !msg.isAiResponse);
                          if (userMessages.length > 0) {
                            // 譛蛻昴・繝ｦ繝ｼ繧ｶ繝ｼ繝｡繝・そ繝ｼ繧ｸ繧剃ｺ玖ｱ｡縺ｨ縺励※菴ｿ逕ｨ
                            incidentTitle = userMessages[0].content || '莠玖ｱ｡縺ｪ縺・;
                          }
                        }
                      }
                      
                      const problemDescription = jsonData?.problemDescription || jsonData?.answer || '隱ｬ譏弱↑縺・;
                      
                      // 讖溽ｨｮ縺ｨ讖滓｢ｰ逡ｪ蜿ｷ繧呈歓蜃ｺ・・PI縺九ｉ霑斐＆繧後ｋ繝・・繧ｿ讒矩縺ｫ蜷医ｏ縺帙ｋ・・
                      const machineType = jsonData?.machineType || 
                                        jsonData?.chatData?.machineInfo?.machineTypeName || 
                                        item.machineInfo?.machineTypeName || 
                                        item.machineType || '';
                      const machineNumber = jsonData?.machineNumber || 
                                          jsonData?.chatData?.machineInfo?.machineNumber || 
                                          item.machineInfo?.machineNumber || 
                                          item.machineNumber || '';
                      
                      // 繝・ヰ繝・げ諠・ｱ
                      console.log(`剥 繧｢繧､繝・Β陦ｨ遉ｺ: ${item.fileName}`, {
                        machineType,
                        machineNumber,
                        jsonDataMachineType: jsonData?.machineType,
                        jsonDataMachineNumber: jsonData?.machineNumber,
                        itemMachineType: item.machineType,
                        itemMachineNumber: item.machineNumber
                      });
                      
                      const messageCount = jsonData?.metadata?.total_messages || 
                                         jsonData?.chatData?.messages?.length || 
                                         jsonData?.messageCount || 0;
                      const exportType = jsonData?.exportType || 'manual_send';
                      const fileName = jsonData?.metadata?.fileName || '';
                      
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 bg-blue-50">
                          <td className="border border-gray-300 px-3 py-2 text-center text-sm">
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={() => handleSelectItem(item.id)}
                              className="w-6 h-6"
                            />
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {machineType || '-'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            {machineNumber || '-'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={incidentTitle}>
                            {incidentTitle}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm max-w-xs truncate" title={problemDescription}>
                            {problemDescription}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">{formatDate(item.createdAt)}</td>
                          <td className="border border-gray-300 px-3 py-2">
                            {(() => {
                              const imageUrl = pickFirstImage(item);
                              if (imageUrl) {
                                return (
                                  <img 
                                    src={imageUrl} 
                                    alt="逕ｻ蜒・ 
                                    className="w-8 h-8 object-cover rounded border"
                                    title="謨・囿逕ｻ蜒・
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                    }}
                                  />
                                );
                              }
                              return <span className="text-gray-500">-</span>;
                            })()}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  console.log('剥 邱ｨ髮・・繧ｿ繝ｳ繧ｯ繝ｪ繝・け - 蜈・・繧｢繧､繝・Β:', item);
                                  console.log('剥 item.machineType:', item.machineType);
                                  console.log('剥 item.machineNumber:', item.machineNumber);
                                  console.log('剥 item.jsonData:', item.jsonData);
                                  
                                  const normalizedItem = normalizeJsonData(item);
                                  console.log('剥 豁｣隕丞喧蠕後・繧｢繧､繝・Β:', normalizedItem);
                                  console.log('剥 豁｣隕丞喧蠕・machineType:', normalizedItem.machineType);
                                  console.log('剥 豁｣隕丞喧蠕・machineNumber:', normalizedItem.machineNumber);
                                  
                                  setEditingItem(normalizedItem);
                                  setShowEditDialog(true);
                                }}
                                className="flex items-center gap-1 text-xs"
                                title="邱ｨ髮・判髱｢繧帝幕縺・
                              >
                                <Settings className="h-3 w-3" />
                                邱ｨ髮・
                              </Button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
                         </div>
           )}
        </CardContent>
      </Card>



      {/* 繧ｨ繧ｯ繧ｹ繝昴・繝亥・逅・お繝ｪ繧｢ */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">繧ｨ繧ｯ繧ｹ繝昴・繝亥・逅・/h2>
        </div>
        
        <div className="flex flex-wrap gap-4 mb-4">
          {/* 驕ｸ謚槫ｱ･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝・*/}
          <div className="flex gap-2">
            <Button
              onClick={() => handleExportSelected('json')}
              disabled={exportLoading || selectedItems.size === 0}
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              驕ｸ謚槫ｱ･豁ｴ繧谷SON繧ｨ繧ｯ繧ｹ繝昴・繝・({selectedItems.size})
            </Button>
            <Button
              onClick={() => handleExportSelected('csv')}
              disabled={exportLoading || selectedItems.size === 0}
              variant="default"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              驕ｸ謚槫ｱ･豁ｴ繧辰SV繧ｨ繧ｯ繧ｹ繝昴・繝・({selectedItems.size})
            </Button>
            <Button
              onClick={handlePrintTable}
              disabled={exportLoading || selectedItems.size === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              驕ｸ謚槭・荳隕ｧ繧貞魂蛻ｷ ({selectedItems.size})
            </Button>
          </div>

          {/* 蜈ｨ螻･豁ｴ繧ｨ繧ｯ繧ｹ繝昴・繝・*/}
          <div className="flex gap-2">
            <Button
              onClick={() => handleExportAll('json')}
              disabled={exportLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              蜈ｨ螻･豁ｴ繧谷SON繧ｨ繧ｯ繧ｹ繝昴・繝・
            </Button>
            <Button
              onClick={() => handleExportAll('csv')}
              disabled={exportLoading}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              蜈ｨ螻･豁ｴ繧辰SV繧ｨ繧ｯ繧ｹ繝昴・繝・
            </Button>
          </div>
        </div>

        {exportLoading && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            繧ｨ繧ｯ繧ｹ繝昴・繝亥・逅・ｸｭ...
          </div>
        )}
      </div>

      {/* 繝壹・繧ｸ繝阪・繧ｷ繝ｧ繝ｳ */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              蜑阪∈
            </Button>
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              谺｡縺ｸ
            </Button>
          </div>
        </div>
      )}

      {/* 繝励Ξ繝薙Η繝ｼ繝繧､繧｢繝ｭ繧ｰ */}
      {showPreviewDialog && previewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">螻･豁ｴ繝励Ξ繝薙Η繝ｼ</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePrintReport(previewItem)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    蜊ｰ蛻ｷ
                  </Button>
                  <Button
                    onClick={() => {
                      const normalizedItem = normalizeJsonData(previewItem);
                      setEditingItem(normalizedItem);
                      setShowPreviewDialog(false);
                      setShowEditDialog(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    邱ｨ髮・↓遘ｻ蜍・
                  </Button>
                  <Button variant="ghost" onClick={() => setShowPreviewDialog(false)}>ﾃ・/Button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* 繝ｬ繝昴・繝医・繝・ム繝ｼ */}
                <div className="text-center border-b pb-4">
                  <h1 className="text-2xl font-bold mb-2">蠢懈･蜃ｦ鄂ｮ繧ｵ繝昴・繝亥ｱ･豁ｴ</h1>
                  <p className="text-sm text-gray-500">
                    菴懈・譌･譎・ {formatDate(previewItem.createdAt)}
                  </p>
                </div>

                {/* 蝓ｺ譛ｬ諠・ｱ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">蝓ｺ譛ｬ諠・ｱ</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-500" />
                        <span><strong>讖溽ｨｮ:</strong> {previewItem.machineType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span><strong>讖滓｢ｰ逡ｪ蜿ｷ:</strong> {previewItem.machineNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span><strong>菴懈・譌･譎・</strong> {formatDate(previewItem.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Image className="h-4 w-4 text-gray-500" />
                        <span><strong>逕ｻ蜒・</strong> {previewItem.imagePath ? '縺ゅｊ' : '縺ｪ縺・}</span>
                      </div>
                    </div>
                  </div>
                  
                  {previewItem.imagePath && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">髢｢騾｣逕ｻ蜒・/h3>
                      <img
                        src={previewItem.imagePath}
                        alt="螻･豁ｴ逕ｻ蜒・
                        className="w-full h-48 object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>

                {/* 隧ｳ邏ｰ諠・ｱ */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">隧ｳ邏ｰ諠・ｱ</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <pre className="text-sm overflow-auto max-h-64">
                      {JSON.stringify(previewItem.jsonData, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 邱ｨ髮・ム繧､繧｢繝ｭ繧ｰ */}
      {showEditDialog && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-auto">
            <div className="p-6">
              {/* 讖溽ｨｮ繝ｻ讖滓｢ｰ逡ｪ蜿ｷ繝・・繧ｿ縺瑚ｪｭ縺ｿ霎ｼ縺ｾ繧後※縺・↑縺・ｴ蜷医・蜀榊叙蠕・*/}
              {(() => {
                if (machineData.machineTypes.length === 0 && !machineDataLoading) {
                  fetchMachineDataFromAPI();
                }
                
                // 繝・ヰ繝・げ: 邱ｨ髮・ム繧､繧｢繝ｭ繧ｰ縺碁幕縺九ｌ縺滓凾縺ｮ蛻晄悄蛟､繧偵Ο繧ｰ蜃ｺ蜉・
                console.log('邱ｨ髮・ム繧､繧｢繝ｭ繧ｰ陦ｨ遉ｺ譎ゅ・editingItem:', {
                  machineType: editingItem.machineType,
                  machineNumber: editingItem.machineNumber,
                  fileName: editingItem.fileName,
                  title: editingItem.jsonData?.title,
                  question: editingItem.jsonData?.question,
                  jsonData: editingItem.jsonData
                });
                
                return null;
              })()}
              
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">讖滓｢ｰ謨・囿諠・ｱ邱ｨ髮・/h2>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      console.log('邱ｨ髮・ョ繝ｼ繧ｿ繧剃ｿ晏ｭ倥＠縺ｾ縺・', editingItem);
                      handleSaveEditedItem(editingItem);
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Download className="h-4 w-4" />
                    菫晏ｭ・
                  </Button>
                  <Button
                    onClick={() => handlePrintReport(editingItem)}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    蜊ｰ蛻ｷ
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      console.log('邱ｨ髮・ｒ繧ｭ繝｣繝ｳ繧ｻ繝ｫ縺励∪縺・);
                      setShowEditDialog(false);
                      setEditingItem(null);
                    }}
                  >
                    繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                  </Button>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* 蝓ｺ譛ｬ諠・ｱ邱ｨ髮・*/}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    蝓ｺ譛ｬ諠・ｱ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">讖溽ｨｮ</label>
                      {machineDataLoading ? (
                        <div className="h-10 flex items-center px-3 border border-gray-300 rounded">
                          隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...
                        </div>
                      ) : (
                        <Select
                          value={editingItem.machineType || ''}
                          onValueChange={(value) => {
                            console.log('讖溽ｨｮ繧貞､画峩:', value);
                            setEditingItem({
                              ...editingItem,
                              machineType: value,
                              jsonData: {
                                ...editingItem.jsonData,
                                machineType: value
                              }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="讖溽ｨｮ繧帝∈謚・ />
                          </SelectTrigger>
                          <SelectContent>
                            {/* 繝・ヰ繝・げ: Select隕∫ｴ縺ｮ蛟､繧堤｢ｺ隱・*/}
                            {(() => {
                              console.log('剥 讖溽ｨｮSelect - editingItem.machineType:', editingItem.machineType);
                              console.log('剥 讖溽ｨｮSelect - machineData.machineTypes:', machineData.machineTypes);
                              return null;
                            })()}
                            {machineData.machineTypes.map((machineType) => (
                              <SelectItem key={machineType.id} value={machineType.machineTypeName}>
                                {machineType.machineTypeName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">讖滓｢ｰ逡ｪ蜿ｷ</label>
                      {machineDataLoading ? (
                        <div className="h-10 flex items-center px-3 border border-gray-300 rounded">
                          隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...
                        </div>
                      ) : (
                        <Select
                          value={editingItem.machineNumber || ''}
                          onValueChange={(value) => {
                            console.log('讖滓｢ｰ逡ｪ蜿ｷ繧貞､画峩:', value);
                            setEditingItem({
                              ...editingItem,
                              machineNumber: value,
                              jsonData: {
                                ...editingItem.jsonData,
                                machineNumber: value
                              }
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="讖滓｢ｰ逡ｪ蜿ｷ繧帝∈謚・ />
                          </SelectTrigger>
                          <SelectContent>
                            {machineData.machines
                              .filter(machine => !editingItem.machineType || machine.machineTypeName === editingItem.machineType)
                              .map((machine) => (
                              <SelectItem key={machine.id} value={machine.machineNumber}>
                                {machine.machineNumber} ({machine.machineTypeName})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">繝輔ぃ繧､繝ｫ蜷・/label>
                      <Input
                        value={editingItem.fileName || ''}
                        onChange={(e) => {
                          console.log('繝輔ぃ繧､繝ｫ蜷阪ｒ螟画峩:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            fileName: e.target.value
                          });
                        }}
                        placeholder="繝輔ぃ繧､繝ｫ蜷・
                        disabled
                      />
                    </div>
                  </div>
                </div>

                {/* 莠玖ｱ｡繝ｻ隱ｬ譏守ｷｨ髮・*/}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    莠玖ｱ｡繝ｻ隱ｬ譏・
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">莠玖ｱ｡繧ｿ繧､繝医Ν</label>
                      <Input
                        value={editingItem.jsonData?.title || editingItem.jsonData?.question || ''}
                        onChange={(e) => {
                          console.log('莠玖ｱ｡繧ｿ繧､繝医Ν繧貞､画峩:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              title: e.target.value,
                              question: e.target.value
                            }
                          });
                        }}
                        placeholder="莠玖ｱ｡繧ｿ繧､繝医Ν繧貞・蜉・
                      />
                      {/* 繝・ヰ繝・げ: 莠玖ｱ｡繧ｿ繧､繝医Ν縺ｮ蛟､繧堤｢ｺ隱・*/}
                      {(() => {
                        const titleValue = editingItem.jsonData?.title || editingItem.jsonData?.question || '';
                        console.log('剥 莠玖ｱ｡繧ｿ繧､繝医Ν - 陦ｨ遉ｺ蛟､:', titleValue);
                        console.log('剥 莠玖ｱ｡繧ｿ繧､繝医Ν - jsonData.title:', editingItem.jsonData?.title);
                        console.log('剥 莠玖ｱ｡繧ｿ繧､繝医Ν - jsonData.question:', editingItem.jsonData?.question);
                        return null;
                      })()}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">莠玖ｱ｡隱ｬ譏・/label>
                      <textarea
                        value={editingItem.jsonData?.problemDescription || editingItem.jsonData?.answer || ''}
                        onChange={(e) => {
                          console.log('莠玖ｱ｡隱ｬ譏弱ｒ螟画峩:', e.target.value);
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              problemDescription: e.target.value,
                              answer: e.target.value
                            }
                          });
                        }}
                        className="w-full h-24 p-3 border border-gray-300 rounded-md"
                        placeholder="莠玖ｱ｡縺ｮ隧ｳ邏ｰ隱ｬ譏弱ｒ蜈･蜉・
                      />
                    </div>
                  </div>
                </div>

                {/* 謨・囿蛟区園縺ｮ逕ｻ蜒擾ｼ井ｿｮ郢戊ｨ育判縺ｮ荳翫↓遘ｻ蜍包ｼ・*/}
                {(() => {
                  const imageUrl = pickFirstImage(editingItem);
                  if (imageUrl) {
                    return (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                          <Image className="h-5 w-5" />
                          謨・囿蛟区園縺ｮ逕ｻ蜒・
                        </h3>
                        <div className="text-center">
                          <img
                            src={imageUrl}
                            alt="謨・囿逕ｻ蜒・
                            className="max-w-full max-h-64 mx-auto border border-gray-300 rounded-md shadow-sm"
                          />
                          <p className="text-sm text-gray-600 mt-2">
                            謨・囿邂・園縺ｮ逕ｻ蜒・{imageUrl.startsWith('data:image/') ? '(Base64)' : '(URL)'}
                          </p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* 菫ｮ郢戊ｨ育判邱ｨ髮・*/}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    菫ｮ郢戊ｨ育判
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">菫ｮ郢穂ｺ亥ｮ壽怦譌･</label>
                      <Input
                        type="date"
                        value={editingItem.jsonData?.repairSchedule || ''}
                        onChange={(e) => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              repairSchedule: e.target.value
                            }
                          });
                        }}
                        placeholder="菫ｮ郢穂ｺ亥ｮ壽怦譌･"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">蝣ｴ謇</label>
                      <Input
                        value={editingItem.jsonData?.location || ''}
                        onChange={(e) => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              location: e.target.value
                            }
                          });
                        }}
                        placeholder="險ｭ鄂ｮ蝣ｴ謇"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">繧ｹ繝・・繧ｿ繧ｹ</label>
                      <Select
                        value={editingItem.jsonData?.status || ''}
                        onValueChange={(value) => {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              status: value
                            }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="繧ｹ繝・・繧ｿ繧ｹ繧帝∈謚・ />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="蝣ｱ蜻頑ｸ医∩">蝣ｱ蜻頑ｸ医∩</SelectItem>
                          <SelectItem value="蟇ｾ蠢應ｸｭ">蟇ｾ蠢應ｸｭ</SelectItem>
                          <SelectItem value="螳御ｺ・>螳御ｺ・/SelectItem>
                          <SelectItem value="菫晉蕗">菫晉蕗</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 險倅ｺ区ｬ・ｼ・00譁・ｭ礼ｨ句ｺｦ・・*/}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    險倅ｺ区ｬ・
                  </h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">蛯呵・・險倅ｺ・(200譁・ｭ嶺ｻ･蜀・</label>
                    <textarea
                      value={editingItem.jsonData?.remarks || ''}
                      onChange={(e) => {
                        if (e.target.value.length <= 200) {
                          setEditingItem({
                            ...editingItem,
                            jsonData: {
                              ...editingItem.jsonData,
                              remarks: e.target.value
                            }
                          });
                        }
                      }}
                      className="w-full h-24 p-3 border border-gray-300 rounded-md"
                      placeholder="菫ｮ郢輔↓髢｢縺吶ｋ蛯呵・ｄ霑ｽ蜉諠・ｱ繧定ｨ倩ｼ峨＠縺ｦ縺上□縺輔＞・・00譁・ｭ嶺ｻ･蜀・ｼ・
                      maxLength={200}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editingItem.jsonData?.remarks?.length || 0}/200譁・ｭ・
                    </p>
                  </div>
                </div>

                {/* 菫晏ｭ倥・繧ｿ繝ｳ・井ｸ矩Κ・・*/}
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      console.log('邱ｨ髮・ｒ繧ｭ繝｣繝ｳ繧ｻ繝ｫ縺励∪縺・);
                      setShowEditDialog(false);
                      setEditingItem(null);
                    }}
                  >
                    繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('邱ｨ髮・ョ繝ｼ繧ｿ繧剃ｿ晏ｭ倥＠縺ｾ縺・', editingItem);
                      handleSaveEditedItem(editingItem);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    菫晏ｭ倥＠縺ｦ驕ｩ逕ｨ
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}





      {/* 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医Ξ繝昴・繝郁｡ｨ遉ｺ */}
      {showReport && selectedReportData && (
        <ChatExportReport
          data={selectedReportData}
          fileName={selectedFileName}
          onClose={handleCloseReport}
          onSave={handleSaveReport}
          onPrint={(reportData) => {
            console.log('繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医Ξ繝昴・繝医ｒ蜊ｰ蛻ｷ:', reportData);
            window.print();
          }}
        />
      )}



    </div>
  );
};

export default HistoryPage;


