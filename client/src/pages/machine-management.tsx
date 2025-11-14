import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Search, Edit, Trash2, ArrowLeft, Settings, Wrench, Hash, Filter } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface MachineType {
  id: string;
  machine_type_name: string;
  created_at?: string;
}

interface Machine {
  id: string;
  machine_number: string;
  machine_type_id: string;
  machine_type_name?: string;
  created_at?: string;
}

export default function MachineManagementPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isMachineDialogOpen, setIsMachineDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MachineType | null>(null);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  const [newTypeName, setNewTypeName] = useState('');
  const [newMachineNumber, setNewMachineNumber] = useState('');
  const [selectedMachineType, setSelectedMachineType] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/chat');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = machines;
    if (searchQuery.trim()) {
      filtered = filtered.filter(machine =>
        machine.machine_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (machine.machine_type_name && machine.machine_type_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (selectedTypeFilter !== 'all') {
      filtered = filtered.filter(machine => machine.machine_type_id === selectedTypeFilter);
    }
    setFilteredMachines(filtered);
  }, [machines, searchQuery, selectedTypeFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { buildApiUrl } = await import('../lib/api');

      const typesResponse = await fetch(buildApiUrl('/machines/machine-types'));
      if (!typesResponse.ok) {
        throw new Error('機種データ取得エラー');
      }
      const typesResult = await typesResponse.json();
      if (typesResult.success) {
        const typesData = typesResult.machineTypes || typesResult.data || [];
        const formattedTypes = typesData.map((type: any) => ({
          id: type.id,
          machine_type_name: type.name || type.machine_type_name || type.category
        }));
        setMachineTypes(formattedTypes);
      }

      const machinesResponse = await fetch(buildApiUrl('/machines'));
      if (!machinesResponse.ok) {
        throw new Error('機械データ取得エラー');
      }
      const machinesResult = await machinesResponse.json();
      if (machinesResult.success) {
        const machinesData = machinesResult.machines || machinesResult.data || [];
        const formattedMachines = machinesData.map((machine: any) => ({
          id: machine.id,
          machine_number: machine.machine_number,
          machine_type_id: machine.machine_type_id,
          machine_type_name: machine.type || machine.machine_type_name
        }));
        setMachines(formattedMachines);
      }
    } catch (error) {
      console.error('データ取得エラー:', error);
      setError(error instanceof Error ? error : new Error('Unknown error'));
      toast({
        title: 'エラー',
        description: 'データの取得に失敗しました。データベースに接続してください。',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-blue-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto w-full bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              設定に戻る
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          <Wrench className="mr-3 h-8 w-8 text-indigo-500" />
          機種機械番号管理
        </h1>
        <p className="text-blue-600 mt-2">機種と機械番号の詳細管理を行います</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardTitle className="text-xl flex items-center">
              <Settings className="mr-2 h-6 w-6" />
              機種管理
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-800">登録済み機種</h3>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {machineTypes.length === 0 ? (
                <div className="text-center py-8 text-blue-600">
                  <p>データベースに接続して機種データを取得してください</p>
                </div>
              ) : (
                machineTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100"
                  >
                    <span className="font-medium text-blue-800">{type.machine_type_name}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-200 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
            <CardTitle className="text-xl flex items-center">
              <Hash className="mr-2 h-6 w-6" />
              機械管理
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="機械番号または機種で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="機種で絞り込み" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全ての機種</SelectItem>
                  {machineTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.machine_type_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>機械番号</TableHead>
                    <TableHead>機種</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-blue-600">
                        データベースに接続して機械データを取得してください
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMachines.map((machine) => (
                      <TableRow key={machine.id}>
                        <TableCell className="font-medium">{machine.machine_number}</TableCell>
                        <TableCell>{machine.machine_type_name}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">エラーが発生しました: {error.message}</p>
        </div>
      )}
    </div>
  );
}
