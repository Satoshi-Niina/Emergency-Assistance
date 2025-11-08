import { useAuth } from '../../context/auth-context';
import { User, LogOut, Shield, UserCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

export function UserInfo() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <Badge variant='destructive' className='flex items-center gap-1'>
            <Shield className='h-3 w-3' />
            運用管理者
          </Badge>
        );
      case 'employee':
        return (
          <Badge variant='secondary' className='flex items-center gap-1'>
            <UserCheck className='h-3 w-3' />
            一般ユーザー
          </Badge>
        );
      default:
        return <Badge variant='outline'>{role}</Badge>;
    }
  };

  return (
    <div className='flex items-center gap-3 p-3 bg-white rounded-lg border shadow-sm'>
      <div className='flex items-center gap-2'>
        <div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
          <User className='h-4 w-4 text-blue-600' />
        </div>
        <div>
          <div className='font-medium text-sm'>{user.displayName}</div>
          <div className='text-xs text-gray-500'>{user.username}</div>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        {getRoleBadge(user.role)}
        <Button
          variant='ghost'
          size='sm'
          onClick={logout}
          className='text-gray-500 hover:text-red-600'
        >
          <LogOut className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}
