// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

type Machine = {
  id: string;
  machine_number: string;
};

type MachineTypeGroup = {
  type_id: string;
  machine_type_name: string;
  machines: Machine[];
};

export default function MachineList() {
  const [data, setData] = useState<MachineTypeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/all-machines`)
      .then(res => res.json())
      .then(json => {
        setData(json.data || []);
        setLoading(false);
        // 初期状態で全て展開
        const allIds = new Set((json.data || []).map((group: MachineTypeGroup) => group.type_id));
        setExpandedGroups(allIds);
      })
      .catch(error => {
        console.error('機種・機械番号一覧取得エラー:', error);
        setLoading(false);
      });
  }, []);

  const toggleGroup = (typeId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedGroups(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3 text-gray-600">機種・機械番号一覧を読み込み中...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">登録されている機種・機械番号がありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">機種と機械番号一覧</h3>
      {data.map(group => (
        <Card key={group.type_id} className="border border-gray-200 shadow-sm">
          <CardHeader 
            className="pb-2 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleGroup(group.type_id)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-gray-800">
                機種: {group.machine_type_name}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  {group.machines.length}台
                </span>
                {expandedGroups.has(group.type_id) ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </div>
            </div>
          </CardHeader>
          {expandedGroups.has(group.type_id) && (
            <CardContent className="pt-0">
              {group.machines.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {group.machines.map(machine => (
                    <div 
                      key={machine.id} 
                      className="bg-blue-50 border border-blue-200 rounded-md p-3 hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-blue-800">
                          機械番号: {machine.machine_number}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  この機種に登録されている機械番号がありません
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}