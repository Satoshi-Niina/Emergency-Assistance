import { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import { useToast } from "../hooks/use-toast.ts";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "../lib/queryClient.ts";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Shield, UserPlus, ArrowLeft, User, Edit, Trash2, AlertCircle } from "lucide-react";
import { useLocation, Link, useNavigate } from "react-router-dom";

// ユーザーインターフェース
interface UserData {
  id: string;
  username: string;
  display_name: string;
  role: "employee" | "admin";
  department?: string;
  description?: string;
}

// 新規ユーザー作成用インターフェース
interface NewUserData {
  username: string;
  password: string;
  display_name: string;
  role: "employee" | "admin";
  department?: string;
  description?: string;
}

export default function UsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [error, setError] = useState<Error | null>(null);

  // ユーザーが未認証またはadmin以外の場合はリダイレクト
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      navigate("/chat");
    }
  }, [user, authLoading, navigate]);

  // ユーザーデータの取得
  const { data: users, isLoading, error: queryError } = useQuery<UserData[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      console.log('🔍 ユーザー一覧取得開始');
      console.log('🔍 現在のユーザー:', user);
      console.log('🔍 セッション状態:', document.cookie);
      
      const res = await apiRequest("GET", "/api/users");
      
      console.log('🔍 ユーザー一覧取得レスポンス:', {
        status: res.status,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries())
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ ユーザー一覧取得エラー:', errorText);
        
        // 認証エラーの場合
        if (res.status === 401) {
          throw new Error("認証が必要です。ログインしてください。");
        }
        
        // 権限エラーの場合
        if (res.status === 403) {
          throw new Error("管理者権限が必要です。");
        }
        
        // その他のエラー
        throw new Error("ユーザー取得失敗: " + errorText);
      }
      
      const userData = await res.json();
      console.log('🔍 ユーザー一覧データ:', userData);
      
      // APIレスポンスの構造に合わせてデータを取得
      if (userData.success && userData.data) {
        return userData.data;
      } else if (userData.success && userData.flows) {
        // flowsプロパティがある場合（他のAPIとの互換性）
        return userData.flows;
      } else if (Array.isArray(userData)) {
        return userData;
      } else {
        console.error('❌ 予期しないユーザーデータ形式:', userData);
        throw new Error("ユーザーデータの形式が不正です");
      }
    },
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // 認証エラーや権限エラーの場合は再試行しない
      if (error instanceof Error) {
        if (error.message.includes('認証が必要') || error.message.includes('管理者権限')) {
          return false;
        }
      }
      return failureCount < 2; // 最大2回まで再試行
    },
  });

  // エラー表示の追加
  useEffect(() => {
    if (queryError) {
      console.error('ユーザー一覧取得エラー詳細:', queryError);
      
      let errorMessage = "ユーザー一覧の取得に失敗しました";
      if (queryError instanceof Error) {
        errorMessage = queryError.message;
      }
      
      toast({
        title: "エラー",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [queryError, toast]);

  // 認証エラーや権限エラーの場合の表示
  if (queryError instanceof Error) {
    if (queryError.message.includes('認証が必要') || queryError.message.includes('管理者権限')) {
      return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center">
                <Shield className="mr-2 h-6 w-6" />
                ユーザー管理
              </h1>
              <p className="text-neutral-300">システムの全ユーザーを管理します</p>
            </div>
            <Link to="/settings">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                設定に戻る
              </Button>
            </Link>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">アクセス権限がありません</h3>
                <p className="text-gray-600 mb-4">
                  {queryError.message.includes('認証が必要') 
                    ? "ログインが必要です。再度ログインしてください。" 
                    : "このページにアクセスするには管理者権限が必要です。"}
                </p>
                <Link to="/chat">
                  <Button>
                    チャットに戻る
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // 新規ユーザーフォーム
  const [showNewUserDialog, setShowNewUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<Partial<NewUserData>>({
    username: "",
    password: "",
    display_name: "",
    role: "employee",
    department: "",
    description: "",
  });
  const [editUser, setEditUser] = useState<Partial<UserData & { password?: string; description?: string }>>({
    username: "",
    display_name: "",
    role: "employee",
    password: "",
    description: "",
  });

  // フォームの値をリセット
  const resetNewUserForm = () => {
    setNewUser({
      username: "",
      password: "",
      display_name: "",
      role: "employee",
      department: "",
      description: "",
    });
  };

  // ユーザー作成のミューテーション
  const createUserMutation = useMutation({
    mutationFn: async (userData: NewUserData) => {
      console.log('🔍 ユーザー作成リクエスト開始:', userData);
      console.log('🔍 現在のユーザー:', user);
      console.log('🔍 セッション状態:', document.cookie);
      
      const res = await apiRequest("POST", "/api/users", userData);
      
      console.log('🔍 ユーザー作成レスポンス:', {
        status: res.status,
        ok: res.ok,
        headers: Object.fromEntries(res.headers.entries())
      });
      
      if (!res.ok) {
        let errorMessage = "ユーザー作成に失敗しました";
        
        try {
          const errorData = await res.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // JSONパースに失敗した場合はテキストとして読み取り
          const errorText = await res.text();
          errorMessage = errorText || errorMessage;
        }
        
        console.error('❌ ユーザー作成エラー:', errorMessage);
        throw new Error(errorMessage);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      // より確実にクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.refetchQueries({ queryKey: ["/api/users"] });
      toast({
        title: "ユーザー作成完了",
        description: "新しいユーザーが作成されました",
      });
      setShowNewUserDialog(false);
      resetNewUserForm();
    },
    onError: (error: any) => {
      console.error('❌ ユーザー作成ミューテーションエラー:', error);
      toast({
        title: "ユーザー作成失敗",
        description: error.message || "ユーザー作成中にエラーが発生しました",
        variant: "destructive",
      });
    },
  });

  // フォーム送信処理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!newUser.username || !newUser.password || !newUser.display_name || !newUser.role) {
      toast({
        title: "入力エラー",
        description: "ユーザー名、パスワード、表示名、権限は必須項目です",
        variant: "destructive",
      });
      return;
    }

    // ユーザー名の形式チェック
    if (newUser.username.length < 3 || newUser.username.length > 50) {
      toast({
        title: "入力エラー",
        description: "ユーザー名は3文字以上50文字以下で入力してください",
        variant: "destructive",
      });
      return;
    }

    // パスワードの強度チェック
    if (newUser.password.length < 6) {
      toast({
        title: "入力エラー",
        description: "パスワードは6文字以上で入力してください",
        variant: "destructive",
      });
      return;
    }

    // 表示名の形式チェック
    if (newUser.display_name.length < 1 || newUser.display_name.length > 100) {
      toast({
        title: "入力エラー",
        description: "表示名は1文字以上100文字以下で入力してください",
        variant: "destructive",
      });
      return;
    }

    // 権限の値チェック
    if (!['employee', 'admin'].includes(newUser.role || '')) {
      toast({
        title: "入力エラー",
        description: "権限は「一般ユーザー」または「管理者」を選択してください",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate({
      username: newUser.username,
      password: newUser.password,
      display_name: newUser.display_name,
      role: newUser.role || 'employee',
      department: newUser.department || undefined,
      description: newUser.description || undefined
    } as NewUserData);
  };

  // 入力フィールド更新処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  // セレクト更新処理
  const handleSelectChange = (name: string, value: string) => {
    setNewUser((prev) => ({ ...prev, [name]: value }));
  };

  // 編集用セレクト更新処理
  const handleEditSelectChange = (name: string, value: string) => {
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  // 編集用入力フィールド更新処理
  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditUser((prev) => ({ ...prev, [name]: value }));
  };

  // ユーザー編集準備
  const handleEditUser = (userData: UserData) => {
    setSelectedUserId(userData.id);
    setEditUser({
      username: userData.username,
      display_name: userData.display_name,
      role: userData.role,
      department: userData.department,
      description: userData.description,
      password: "" // パスワードフィールドを空で初期化
    });
    setShowEditUserDialog(true);
  };

  // ユーザー削除準備
  const handleDeleteUser = (userId: string) => {
    setSelectedUserId(userId);
    setShowDeleteConfirmDialog(true);
  };

  // ユーザー編集のミューテーション
  const updateUserMutation = useMutation({
    mutationFn: async (userData: Partial<UserData>) => {
      if (!selectedUserId) throw new Error("ユーザーIDが選択されていません");
      
      console.log(`[DEBUG] ユーザー更新リクエスト送信: ID="${selectedUserId}"`, userData);
      console.log(`[DEBUG] selectedUserId type: ${typeof selectedUserId}, length: ${selectedUserId.length}`);
      console.log(`[DEBUG] selectedUserId bytes:`, selectedUserId ? Array.from(selectedUserId).map(c => c.charCodeAt(0)) : 'null');
      console.log(`[DEBUG] API URL:`, `/api/users/${selectedUserId}`);
      console.log(`[DEBUG] 送信データ:`, JSON.stringify(userData, null, 2));
      
      const res = await apiRequest("PATCH", `/api/users/${selectedUserId}`, userData);
      
      console.log(`[DEBUG] レスポンスステータス: ${res.status}`);
      console.log(`[DEBUG] レスポンスヘッダー:`, Object.fromEntries(res.headers.entries()));
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error(`[ERROR] ユーザー更新失敗: ${res.status}`, errorData);
        console.error(`[ERROR] 完全なエラーレスポンス:`, JSON.stringify(errorData, null, 2));
        throw new Error(errorData.message || `HTTP ${res.status}: ユーザー更新に失敗しました`);
      }
      
      return await res.json();
    },
    onSuccess: () => {
      // より確実にクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.refetchQueries({ queryKey: ["/api/users"] });
      toast({
        title: "ユーザー更新完了",
        description: "ユーザー情報が更新されました",
      });
      setShowEditUserDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "ユーザー更新失敗",
        description: error.message || "ユーザー更新中にエラーが発生しました",
        variant: "destructive",
      });
    },
  });

  // ユーザー削除のミューテーション
  const deleteUserMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUserId) throw new Error("ユーザーIDが選択されていません");
      // 自分自身のアカウントは削除できないチェックを追加
      if (user && selectedUserId === user.id) {
        throw new Error("自分自身のアカウントは削除できません");
      }

      const res = await apiRequest("DELETE", `/api/users/${selectedUserId}`);

      // エラーレスポンスをハンドリング
      if (!res.ok) {
        const errorData = await res.json();

        // サーバーエラーのチェック
        if (res.status === 500) {
          throw new Error("ユーザーに関連するデータが存在するため削除できません。関連データをすべて削除してから再度お試しください。");
        }

        throw new Error(errorData.message || "ユーザー削除中にエラーが発生しました");
      }

      return await res.json();
    },
    onSuccess: () => {
      // より確実にクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.refetchQueries({ queryKey: ["/api/users"] });
      toast({
        title: "ユーザー削除完了",
        description: "ユーザーが削除されました",
      });
      setShowDeleteConfirmDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "ユーザー削除失敗",
        description: error.message || "ユーザー削除中にエラーが発生しました",
        variant: "destructive",
      });
      setShowDeleteConfirmDialog(false);
    },
  });

  // 編集フォーム送信処理
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // バリデーション
    if (!editUser.username || !editUser.display_name) {
      toast({
        title: "入力エラー",
        description: "必須項目を入力してください",
        variant: "destructive",
      });
      return;
    }

    // 空のパスワードフィールドを除去して送信
    const sanitizedEditUser = { ...editUser };
    
    // パスワードが空、undefined、null、空白文字の場合は完全に除去
    if (!sanitizedEditUser.password || 
        typeof sanitizedEditUser.password !== 'string' || 
        sanitizedEditUser.password.trim().length === 0) {
      delete sanitizedEditUser.password;
      console.log('空のパスワードフィールドを除去しました');
    } else {
      console.log('パスワードフィールドを送信します');
    }
    
    console.log('送信するユーザーデータ:', { 
      ...sanitizedEditUser, 
      password: sanitizedEditUser.password ? '[SET]' : '[NOT_SET]' 
    });
    
    updateUserMutation.mutate(sanitizedEditUser);
  };

  // 管理者でない場合のローディング表示
  if (!user || (user && user.role !== "admin")) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Shield className="mr-2 h-6 w-6" />
            ユーザー管理
          </h1>
          <p className="text-neutral-300">システムの全ユーザーを管理します</p>
        </div>

        <div className="flex space-x-2">
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              設定に戻る
            </Button>
          </Link>
          <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                新規ユーザー作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規ユーザー作成</DialogTitle>
                <DialogDescription>
                  新しいユーザーアカウントを作成します。
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">ユーザー名</Label>
                    <Input
                      id="username"
                      name="username"
                      value={newUser.username}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">パスワード</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={newUser.password}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="display_name">表示名</Label>
                    <Input
                      id="display_name"
                      name="display_name"
                      value={newUser.display_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="department">部署</Label>
                    <Input
                      id="department"
                      name="department"
                      value={newUser.department || ""}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">説明</Label>
                    <Input
                      id="description"
                      name="description"
                      value={newUser.description || ""}
                      onChange={handleInputChange}
                      placeholder="ユーザーの説明（任意）"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="role">権限</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value) => handleSelectChange("role", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="権限を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">一般ユーザー</SelectItem>
                        <SelectItem value="admin">管理者</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewUserDialog(false)}
                  >
                    キャンセル
                  </Button>
                  <Button 
                    type="submit"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? "作成中..." : "作成"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <User className="mr-2 h-5 w-5" />
            ユーザー一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-4">読み込み中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ユーザー名</TableHead>
                  <TableHead>表示名</TableHead>
                  <TableHead>権限</TableHead>
                  <TableHead>部署</TableHead>
                  <TableHead>説明</TableHead>
                  <TableHead className="text-right">アクション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.display_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          user.role === "admin" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {user.role === "admin" ? "管理者" : "一般ユーザー"}
                        </span>
                      </TableCell>
                      <TableCell>{user.department || "-"}</TableCell>
                      <TableCell>{user.description || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      ユーザーが見つかりません
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ユーザー編集ダイアログ */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー編集</DialogTitle>
            <DialogDescription>
              ユーザーアカウント情報を編集します。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-username">ユーザー名</Label>
                <Input
                  id="edit-username"
                  name="username"
                  value={editUser.username}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-display_name">表示名</Label>
                <Input
                  id="edit-display_name"
                  name="display_name"
                  value={editUser.display_name}
                  onChange={handleEditInputChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-password">新しいパスワード（変更する場合のみ）</Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  value={editUser.password || ""}
                  onChange={handleEditInputChange}
                  placeholder="パスワードを変更しない場合は空欄のまま"
                />
                 <p className="text-sm text-gray-500 mt-1">
                    ※パスワードを変更しない場合は空のままにしてください
                  </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-department">部署</Label>
                <Input
                  id="edit-department"
                  name="department"
                  value={editUser.department || ""}
                  onChange={handleEditInputChange}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-description">説明</Label>
                <Input
                  id="edit-description"
                  name="description"
                  value={editUser.description || ""}
                  onChange={handleEditInputChange}
                  placeholder="ユーザーの説明（任意）"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-role">権限</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => handleEditSelectChange("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="権限を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">一般ユーザー</SelectItem>
                    <SelectItem value="admin">管理者</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditUserDialog(false)}
              >
                キャンセル
              </Button>
              <Button 
                type="submit"
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? "更新中..." : "更新"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ユーザー削除確認ダイアログ */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-500" />
              ユーザー削除の確認
            </DialogTitle>
            <DialogDescription>
              このユーザーを削除すると、関連するすべてのデータが削除されます。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <p className="text-center font-medium">本当にこのユーザーを削除しますか？</p>
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
              <p className="flex items-start">
                <AlertCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>注意:</strong> チャット、メッセージ、ドキュメントなど、このユーザーに関連するすべてのデータが削除されます。
                  ユーザーがチャットやドキュメントを持っている場合、それらも同時に削除されます。
                </span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteConfirmDialog(false)}
            >
              キャンセル
            </Button>
            <Button 
              type="button"
              variant="destructive"
              onClick={() => deleteUserMutation.mutate()}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}