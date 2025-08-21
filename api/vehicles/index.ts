import { AzureFunction, Context, HttpRequest } from "@azure/functions";

interface Vehicle {
  id: string;
  modelName: string;
  modelNumber: string;
  manufacturer: string;
  category: string;
  specifications: {
    engine: string;
    powerOutput: string;
    weight: string;
    dimensions: string;
  };
  maintenanceInfo: {
    inspectionIntervalDays: number;
    lastInspectionDate?: string;
    nextInspectionDate?: string;
  };
  status: 'active' | 'maintenance' | 'retired';
  registrationDate: string;
}

// サンプル車両データ
const vehicleData: Vehicle[] = [
  {
    id: 'v001',
    modelName: 'パワーショベル PC200',
    modelNumber: 'PC200-8',
    manufacturer: 'コマツ',
    category: '油圧ショベル',
    specifications: {
      engine: '4気筒ディーゼル',
      powerOutput: '110kW',
      weight: '20,300kg',
      dimensions: 'L9,430 × W2,800 × H3,190mm'
    },
    maintenanceInfo: {
      inspectionIntervalDays: 90,
      lastInspectionDate: '2024-01-15',
      nextInspectionDate: '2024-04-15'
    },
    status: 'active',
    registrationDate: '2020-03-15'
  },
  {
    id: 'v002',
    modelName: 'ホイールローダー WA320',
    modelNumber: 'WA320-8',
    manufacturer: 'コマツ',
    category: 'ホイールローダー',
    specifications: {
      engine: '4気筒ディーゼル',
      powerOutput: '129kW',
      weight: '11,900kg',
      dimensions: 'L7,355 × W2,500 × H3,250mm'
    },
    maintenanceInfo: {
      inspectionIntervalDays: 90,
      lastInspectionDate: '2024-01-20',
      nextInspectionDate: '2024-04-20'
    },
    status: 'active',
    registrationDate: '2021-05-20'
  },
  {
    id: 'v003',
    modelName: 'ブルドーザー D65',
    modelNumber: 'D65EX-18',
    manufacturer: 'コマツ',
    category: 'ブルドーザー',
    specifications: {
      engine: '6気筒ディーゼル',
      powerOutput: '141kW',
      weight: '18,400kg',
      dimensions: 'L5,850 × W3,100 × H3,175mm'
    },
    maintenanceInfo: {
      inspectionIntervalDays: 120,
      lastInspectionDate: '2024-01-10',
      nextInspectionDate: '2024-05-10'
    },
    status: 'maintenance',
    registrationDate: '2019-08-12'
  },
  {
    id: 'v004',
    modelName: 'ダンプトラック HD465',
    modelNumber: 'HD465-8',
    manufacturer: 'コマツ',
    category: 'ダンプトラック',
    specifications: {
      engine: '6気筒ディーゼル',
      powerOutput: '294kW',
      weight: '28,800kg',
      dimensions: 'L9,650 × W3,700 × H3,800mm'
    },
    maintenanceInfo: {
      inspectionIntervalDays: 60,
      lastInspectionDate: '2024-01-25',
      nextInspectionDate: '2024-03-25'
    },
    status: 'active',
    registrationDate: '2022-01-10'
  },
  {
    id: 'v005',
    modelName: 'フォークリフト 3FD25',
    modelNumber: '3FD25',
    manufacturer: 'トヨタ',
    category: 'フォークリフト',
    specifications: {
      engine: '4気筒ガソリン',
      powerOutput: '67kW',
      weight: '4,200kg',
      dimensions: 'L3,920 × W1,225 × H2,100mm'
    },
    maintenanceInfo: {
      inspectionIntervalDays: 30,
      lastInspectionDate: '2024-01-28',
      nextInspectionDate: '2024-02-28'
    },
    status: 'active',
    registrationDate: '2023-06-15'
  },
  {
    id: 'v006',
    modelName: 'クレーン車 TK250M',
    modelNumber: 'TK-250M',
    manufacturer: 'タダノ',
    category: 'クレーン車',
    specifications: {
      engine: '6気筒ディーゼル',
      powerOutput: '162kW',
      weight: '31,500kg',
      dimensions: 'L11,990 × W2,490 × H3,750mm'
    },
    maintenanceInfo: {
      inspectionIntervalDays: 30,
      lastInspectionDate: '2024-01-30',
      nextInspectionDate: '2024-03-01'
    },
    status: 'active',
    registrationDate: '2020-12-03'
  }
];

const httpTrigger: AzureFunction = async function (context: Context, req: HttpRequest): Promise<void> {
  // CORS ヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // OPTIONSリクエスト（プリフライト）への対応
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 200,
      headers: corsHeaders,
      body: ''
    };
    return;
  }

  // GETメソッドのみ受け付け
  if (req.method !== 'GET') {
    context.res = {
      status: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
    return;
  }

  try {
    context.log('🚗 Vehicles API呼び出し');

    // クエリパラメータによるフィルタリング
    const { category, status, manufacturer, id } = req.query;
    
    let filteredData = vehicleData;
    
    // 特定のIDで検索
    if (id) {
      filteredData = filteredData.filter(vehicle => vehicle.id === id);
      context.log(`🔍 ID検索: ${id}, 結果: ${filteredData.length}件`);
    } else {
      // その他のフィルターを適用
      if (category) {
        filteredData = filteredData.filter(vehicle => 
          vehicle.category.toLowerCase().includes(category.toString().toLowerCase())
        );
        context.log(`🔍 カテゴリフィルター適用: ${category}, 結果: ${filteredData.length}件`);
      }
      
      if (status) {
        filteredData = filteredData.filter(vehicle => vehicle.status === status);
        context.log(`🔍 ステータスフィルター適用: ${status}, 結果: ${filteredData.length}件`);
      }
      
      if (manufacturer) {
        filteredData = filteredData.filter(vehicle => 
          vehicle.manufacturer.toLowerCase().includes(manufacturer.toString().toLowerCase())
        );
        context.log(`🔍 メーカーフィルター適用: ${manufacturer}, 結果: ${filteredData.length}件`);
      }
    }

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        data: filteredData,
        count: filteredData.length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    context.log.error('❌ Vehicles APIエラー:', error);
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        success: false,
        error: 'サーバーエラーが発生しました',
        timestamp: new Date().toISOString()
      })
    };
  }
};

export default httpTrigger;
