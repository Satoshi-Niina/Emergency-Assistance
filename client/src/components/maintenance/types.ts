// 霆贋ｸ｡菫晏ｮ郁ｨ倬鹸繧ｷ繧ｹ繝・Β縺ｮ蝙句ｮ夂ｾｩ
export interface FaultClassification {
  type: string;
  custom: string;
}

export interface FaultFactor {
  type: string;
  content: string;
}

export interface VehicleMaintenanceRecord {
  metadata: {
    recordId: string;
    createdAt: string;
    version: string;
  };
  occurrence: {
    event: string;
    recordedAt: string;
    vehicle: {
      type: string;
      equipment: {
        category: string;
      };
    };
  };
  fault: {
    classifications: FaultClassification[];
    phenomenon: string;
    factors: FaultFactor[];
  };
  response: {
    inspection: {
      procedure: string[];
    };
    measures: {
      emergency: string[];
      permanent: string;
    };
  };
  notes: {
    remarks: string;
    recorder: string;
  };
}

export interface FormData {
  occurrenceEvent: string;
  vehicleNumber: string;
  equipmentCategory: string;
  phenomenonMemo: string;
  inspectionProcedure: string;
  emergencyMeasures: string;
  permanentCountermeasures: string;
  remarks: string;
  recorder: string;
  faultClassifications: FaultClassification[];
  faultFactors: FaultFactor[];
}



