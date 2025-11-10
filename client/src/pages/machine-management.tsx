import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import { useToast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
  Settings,
  Wrench,
  Hash,
  Filter,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// インターフェース定義
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

  // データ状態
  const [machineTypes, setMachineTypes] = useState<MachineType[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [filteredMachines, setFilteredMachines] = useState<Machine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  // ダイアログ状態
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isMachineDialogOpen, setIsMachineDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<MachineType | null>(null);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  // フォーム状態
  const [newTypeName, setNewTypeName] = useState('');
  const [newMachineNumber, setNewMachineNumber] = useState('');
  const [selectedMachineType, setSelectedMachineType] = useState('');

  // 認証チェック（一般ユーザーでもアクセス可能）
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/chat');
    }
  }, [user, authLoading, navigate]);

  // データ取得
  useEffect(() => {
    fetchData();
  }, []);

  // 検索フィルタリング
  useEffect(() => {
    let filtered = machines;

    // 検索クエリでフィルタリング
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        machine =>
          machine.machine_number
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (machine.machine_type_name &&
            machine.machine_type_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()))
      );
    }

    // 機種でフィルタリング
    if (selectedTypeFilter !== 'all') {
      filtered = filtered.filter(
        machine => machine.machine_type_id === selectedTypeFilter
      );
    }

    setFilteredMachines(filtered);
  }, [machines, searchQuery, selectedTypeFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 統一API設定を使用
      const { buildApiUrl } = await import('../lib/api-unified');

      // 機種一覧取得
      const typesResponse = await fetch(buildApiUrl('/machines/machine-types'));
      const contentType = typesResponse.headers.get('content-type') || '';
      if (!typesResponse.ok || !contentType.includes('application/json')) {
        const text = await typesResponse.text();
        console.error(
          'APIレスポンス非JSON:',
          typesResponse.status,
          contentType,
          text.slice(0, 200)
        );
        throw new Error(
          'API非JSON: ' + typesResponse.status + ' ' + contentType
        );
      }
      const typesResult = await typesResponse.json();
      console.log('機種タイプAPIレスポンス:', typesResult);
      if (typesResult.success) {
        // APIレスポンス形式に対応（machineTypesキーにデータが入っている）
        const typesData = typesResult.machineTypes || typesResult.data || [];
        console.log('機種タイプデータ:', typesData);
        
        // データ形式を統一（machine_type_nameフィールドに統一）
        const formattedTypes = typesData.map((type: any) => ({
          id: type.id,
          machine_type_name: type.name || type.machine_type_name || type.category
        }));
        
        setMachineTypes(formattedTypes);
      }

      // 機械一覧取得
      const machinesResponse = await fetch(buildApiUrl('/machines'));
      const contentType2 = machinesResponse.headers.get('content-type') || '';
      if (!machinesResponse.ok || !contentType2.includes('application/json')) {
        const text2 = await machinesResponse.text();
        console.error(
          'APIレスポンス非JSON:',
          machinesResponse.status,
          contentType2,
          text2.slice(0, 200)
        );
        throw new Error(
          'API非JSON: ' + machinesResponse.status + ' ' + contentType2
        );
      }
      const machinesResult = await machinesResponse.json();
      console.log('機械APIレスポンス:', machinesResult);
      if (machinesResult.success) {
        // APIレスポンス形式に対応（machinesキーにデータが入っている）
        const machinesData = machinesResult.machines || machinesResult.data || [];
        console.log('機械データ:', machinesData);
        
        // データ形式を統一（machine_type_nameフィールドを追加）
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
        description: 'データの取得に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 機種追加・編集
  const handleTypeSubmit = async () => {
    if (!newTypeName.trim()) return;

    try {
      // 統一API設定を使用
      const { buildApiUrl } = await import('../lib/api-unified');
      
      const url = editingType
        ? buildApiUrl(`/machines/machine-types/${editingType.id}`)
        : buildApiUrl('/machines/machine-types');

      const method = editingType ? 'PUT' : 'POST';

      // 認証トークンを取得
      const token = localStorage.getItem('authToken');
      const headers = { 
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({ 
          machine_type_name: newTypeName.trim()
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('機種保存成功:', result);
        toast({
          title: editingType ? '機種を更新しました' : '機種を追加しました',
          description: `${newTypeName} が正常に処理されました`,
        });
        setNewTypeName('');
        setEditingType(null);
        setIsTypeDialogOpen(false);
        console.log('データ再取得を開始...');
        await fetchData();
        console.log('データ再取得完了');
      } else {
        const errorText = await response.text();
        console.error('機種保存失敗:', response.status, errorText);
        throw new Error('機種の保存に失敗しました');
      }
    } catch (error) {
      console.error('機種保存エラー:', error);
      toast({
        title: 'エラー',
        description: '機種の保存に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // 機械番号追加・編集
  const handleMachineSubmit = async () => {
    if (!newMachineNumber.trim() || !selectedMachineType) return;

    try {
      // 統一API設定を使用
      const { buildApiUrl } = await import('../lib/api-unified');
      
      const url = editingMachine
        ? buildApiUrl(`/machines/${editingMachine.id}`)
        : buildApiUrl('/machines');

      const method = editingMachine ? 'PUT' : 'POST';

      // 認証トークンを取得
      const token = localStorage.getItem('authToken');
      const headers = { 
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          machine_number: newMachineNumber.trim(),
          machine_type_id: selectedMachineType,
        }),
      });

      if (response.ok) {
        toast({
          title: editingMachine
            ? '機械番号を更新しました'
            : '機械番号を追加しました',
          description: `${newMachineNumber} が正常に処理されました`,
        });
        setNewMachineNumber('');
        setSelectedMachineType('');
        setEditingMachine(null);
        setIsMachineDialogOpen(false);
        fetchData();
      } else {
        throw new Error('機械番号の保存に失敗しました');
      }
    } catch (error) {
      console.error('機械番号保存エラー:', error);
      toast({
        title: 'エラー',
        description: '機械番号の保存に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // 機種削除
  const handleTypeDelete = async (typeId: string, typeName: string) => {
    if (
      !confirm(
        `機種「${typeName}」を削除してもよろしいですか？\n関連する機械番号も削除されます。`
      )
    )
      return;

    try {
      // 認証トークンを取得
      const token = localStorage.getItem('authToken');
      const headers = { 
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      // 統一API設定を使用
      const { buildApiUrl } = await import('../lib/api-unified');
      
      const response = await fetch(
        buildApiUrl(`/machines/machine-types/${typeId}`),
        {
          method: 'DELETE',
          headers,
        }
      );

      if (response.ok) {
        toast({
          title: '機種を削除しました',
          description: `${typeName} と関連する機械番号が削除されました`,
        });
        fetchData();
      } else {
        throw new Error('機種の削除に失敗しました');
      }
    } catch (error) {
      console.error('機種削除エラー:', error);
      toast({
        title: 'エラー',
        description: '機種の削除に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // 機械番号削除
  const handleMachineDelete = async (
    machineId: string,
    machineNumber: string
  ) => {
    if (!confirm(`機械番号「${machineNumber}」を削除してもよろしいですか？`))
      return;

    try {
      // 認証トークンを取得
      const token = localStorage.getItem('authToken');
      const headers = { 
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

      // 統一API設定を使用
      const { buildApiUrl } = await import('../lib/api-unified');
      
      const response = await fetch(
        buildApiUrl(`/machines/${machineId}`),
        {
          method: 'DELETE',
          headers,
        }
      );

      if (response.ok) {
        toast({
          title: '機械番号を削除しました',
          description: `${machineNumber} が削除されました`,
        });
        fetchData();
      } else {
        throw new Error('機械番号の削除に失敗しました');
      }
    } catch (error) {
      console.error('機械番号削除エラー:', error);
      toast({
        title: 'エラー',
        description: '機械番号の削除に失敗しました',
        variant: 'destructive',
      });
    }
  };

  // 編集開始
  const handleEditType = (type: MachineType) => {
    setEditingType(type);
    setNewTypeName(type.machine_type_name);
    setIsTypeDialogOpen(true);
  };

  const handleEditMachine = (machine: Machine) => {
    setEditingMachine(machine);
    setNewMachineNumber(machine.machine_number);
    setSelectedMachineType(machine.machine_type_id);
    setIsMachineDialogOpen(true);
  };

  // ダイアログリセット
  const resetTypeDialog = () => {
    setEditingType(null);
    setNewTypeName('');
    setIsTypeDialogOpen(false);
  };

  const resetMachineDialog = () => {
    setEditingMachine(null);
    setNewMachineNumber('');
    setSelectedMachineType('');
    setIsMachineDialogOpen(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className='flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto w-full bg-gradient-to-br from-blue-50 to-indigo-50'>
        <div className='flex justify-center items-center h-64'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
            <p className='text-blue-600'>読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto w-full bg-gradient-to-br from-blue-50 to-indigo-50'>
      {/* ヘッダー */}
      <div className='mb-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
              <Wrench className='mr-2 h-6 w-6 text-indigo-500' />
              機種・機械番号管理
            </h1>
            <p className='text-blue-400'>
              機種と機械番号の一覧表示、追加、編集、削除ができます
            </p>
          </div>
          <Link to='/settings'>
            <Button
              variant='outline'
              className='border-blue-300 text-blue-700 hover:bg-blue-50'
            >
              <ArrowLeft className='mr-2 h-4 w-4' />
              設定に戻る
            </Button>
          </Link>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <Card className='mb-6 border-red-200 bg-red-50'>
          <CardContent className='pt-6'>
            <div className='text-red-600'>
              <p className='font-medium'>エラーが発生しました</p>
              <p className='text-sm'>{error.message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* 機種管理 */}
        <Card className='lg:col-span-1'>
          <CardHeader className='pb-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white'>
            <CardTitle className='text-lg flex items-center justify-between'>
              <span className='flex items-center'>
                <Settings className='mr-2 h-5 w-5' />
                機種管理
              </span>
              <Dialog
                open={isTypeDialogOpen}
                onOpenChange={setIsTypeDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size='sm'
                    className='bg-white/20 hover:bg-white/30 text-white border-white/30'
                    onClick={resetTypeDialog}
                  >
                    <Plus className='mr-1 h-3 w-3' />
                    追加
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingType ? '機種を編集' : '新規機種追加'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingType
                        ? '機種名を編集してください'
                        : '新しい機種名を入力してください'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className='space-y-4'>
                    <div>
                      <Label htmlFor='type-name'>機種名</Label>
                      <Input
                        id='type-name'
                        value={newTypeName}
                        onChange={e => setNewTypeName(e.target.value)}
                        placeholder='機種名を入力'
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant='outline' onClick={resetTypeDialog}>
                      キャンセル
                    </Button>
                    <Button onClick={handleTypeSubmit}>
                      {editingType ? '更新' : '追加'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent className='p-0'>
            <div className='max-h-96 overflow-y-auto'>
              {machineTypes.length === 0 ? (
                <div className='p-4 text-center text-gray-500'>
                  機種が登録されていません
                </div>
              ) : (
                <div className='divide-y'>
                  {machineTypes.map(type => (
                    <div key={type.id} className='p-4 hover:bg-gray-50'>
                      <div className='flex items-center justify-between'>
                        <div>
                          <p className='font-medium text-gray-900'>
                            {type.machine_type_name}
                          </p>
                          <p className='text-sm text-gray-500'>
                            {
                              machines.filter(
                                m => m.machine_type_id === type.id
                              ).length
                            }
                            台の機械
                          </p>
                        </div>
                        <div className='flex gap-1'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEditType(type)}
                            className='h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                          >
                            <Edit className='h-3 w-3' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() =>
                              handleTypeDelete(type.id, type.machine_type_name)
                            }
                            className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                          >
                            <Trash2 className='h-3 w-3' />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 機械番号管理 */}
        <Card className='lg:col-span-2'>
          <CardHeader className='pb-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white'>
            <CardTitle className='text-lg flex items-center justify-between'>
              <span className='flex items-center'>
                <Hash className='mr-2 h-5 w-5' />
                機械番号管理
              </span>
              <Dialog
                open={isMachineDialogOpen}
                onOpenChange={setIsMachineDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size='sm'
                    className='bg-white/20 hover:bg-white/30 text-white border-white/30'
                    onClick={resetMachineDialog}
                  >
                    <Plus className='mr-1 h-3 w-3' />
                    追加
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingMachine ? '機械番号を編集' : '新規機械番号追加'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingMachine
                        ? '機械番号を編集してください'
                        : '新しい機械番号を入力してください'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className='space-y-4'>
                    <div>
                      <Label htmlFor='machine-type'>機種</Label>
                      <Select
                        value={selectedMachineType}
                        onValueChange={setSelectedMachineType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='機種を選択' />
                        </SelectTrigger>
                        <SelectContent>
                          {machineTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.machine_type_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor='machine-number'>機械番号</Label>
                      <Input
                        id='machine-number'
                        value={newMachineNumber}
                        onChange={e => setNewMachineNumber(e.target.value)}
                        placeholder='機械番号を入力'
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant='outline' onClick={resetMachineDialog}>
                      キャンセル
                    </Button>
                    <Button onClick={handleMachineSubmit}>
                      {editingMachine ? '更新' : '追加'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 検索・フィルター */}
            <div className='mb-4 space-y-4'>
              <div className='flex gap-4'>
                <div className='flex-1'>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                    <Input
                      placeholder='機械番号または機種名で検索...'
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                </div>
                <div className='w-48'>
                  <Select
                    value={selectedTypeFilter}
                    onValueChange={setSelectedTypeFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='機種でフィルター' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>すべての機種</SelectItem>
                      {machineTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.machine_type_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 機械番号一覧 */}
            <div className='border rounded-lg'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>機械番号</TableHead>
                    <TableHead>機種</TableHead>
                    <TableHead className='text-right'>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMachines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className='text-center py-8 text-gray-500'
                      >
                        {searchQuery || selectedTypeFilter !== 'all'
                          ? '検索条件に一致する機械番号が見つかりません'
                          : '機械番号が登録されていません'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMachines.map(machine => (
                      <TableRow key={machine.id}>
                        <TableCell className='font-medium'>
                          {machine.machine_number}
                        </TableCell>
                        <TableCell>{machine.machine_type_name}</TableCell>
                        <TableCell className='text-right'>
                          <div className='flex justify-end gap-1'>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() => handleEditMachine(machine)}
                              className='h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                            >
                              <Edit className='h-3 w-3' />
                            </Button>
                            <Button
                              variant='ghost'
                              size='sm'
                              onClick={() =>
                                handleMachineDelete(
                                  machine.id,
                                  machine.machine_number
                                )
                              }
                              className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                            >
                              <Trash2 className='h-3 w-3' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
