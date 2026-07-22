import CommonLoginPanel from '../components/auth/common-login-panel';

export default function Login() {
  return (
    <CommonLoginPanel
      appId='troubleshoot'
      appTitle='共通ログイン'
      appSubtitle='応急処置支援アプリ'
      redirectTo='/apps/troubleshoot'
      heroTitle='応急処置支援アプリ'
      heroSubtitle='テナントに応じた認証とDB切替を行う共通ログイン画面です。'
    />
  );
}
