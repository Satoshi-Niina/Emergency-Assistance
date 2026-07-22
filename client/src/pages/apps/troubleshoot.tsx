import { useAuth } from '../../context/auth-context';
import CommonLoginPanel from '../../components/auth/common-login-panel';
import TroubleshootingPage from '../troubleshooting';

export default function TroubleshootAppPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-slate-950 text-white'>
        <div className='text-center space-y-3'>
          <div className='mx-auto h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-500' />
          <p className='text-slate-300'>認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <CommonLoginPanel
        appId='troubleshoot'
        appTitle='応急処置支援アプリ'
        appSubtitle='共通ログイン'
        redirectTo='/apps/troubleshoot'
        heroTitle='応急処置支援アプリ'
        heroSubtitle='未認証の場合はこの共通ログインからテナントを判定し、アプリへ遷移します。'
      />
    );
  }

  return <TroubleshootingPage />;
}
