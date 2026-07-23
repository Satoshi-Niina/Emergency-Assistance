import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useTenantAuth } from './tenant-auth-context';
import { buildTenantPath, resolveCurrentTenantId } from './tenant-path';

export type TenantLoginPanelProps = {
  appId: string;
  appTitle: string;
  appSubtitle?: string;
  redirectTo: string;
  heroTitle?: string;
  heroSubtitle?: string;
};

type LocationState = {
  from?: {
    pathname?: string;
  };
};

export function TenantLoginPanel({
  appId,
  appTitle,
  appSubtitle = '共通ログイン',
  redirectTo,
  heroTitle = '応急処置支援アプリ',
  heroSubtitle = 'テナントに応じた認証とデータ接続を行います',
}: TenantLoginPanelProps) {
  const { login, user, isLoading: authLoading } = useTenantAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | null) || null;
  const tenantId = resolveCurrentTenantId(location.pathname);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      navigate(buildTenantPath(redirectTo, tenantId), { replace: true });
    }
  }, [authLoading, navigate, redirectTo, tenantId, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || authLoading) return;

    if (!username.trim() || !password) {
      setErrorMessage('ユーザー名とパスワードを入力してください');
      return;
    }

    if (!tenantId) {
      setErrorMessage('テナントIDをURLから取得できませんでした');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await login(username.trim(), password, appId, tenantId);
      navigate(buildTenantPath(state?.from?.pathname || redirectTo, tenantId), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ログインに失敗しました';
      if (message.includes('401')) {
        setErrorMessage('ユーザー名またはパスワードが正しくありません。');
      } else if (message.includes('503')) {
        setErrorMessage('共通DBまたはテナントDBに接続できません。');
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className='min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.9),_rgba(227,242,253,0.95))] flex items-center justify-center px-4'>
        <div className='rounded-3xl bg-white/80 backdrop-blur border border-slate-200 shadow-2xl px-8 py-10 text-center max-w-sm w-full'>
          <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600' />
          <p className='text-slate-600'>認証状態を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.18),_transparent_42%),linear-gradient(180deg,_#f8fbff_0%,_#eef7ff_100%)] px-4 py-8 flex items-center justify-center'>
      <div className='w-full max-w-5xl grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-stretch'>
        <section className='rounded-[2rem] border border-sky-100 bg-slate-950 text-white p-8 lg:p-10 shadow-[0_30px_80px_rgba(15,23,42,0.25)] overflow-hidden relative'>
          <div className='absolute inset-0 opacity-35 pointer-events-none bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.42),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.34),_transparent_24%)]' />
          <div className='relative z-10 space-y-6'>
            <span className='inline-flex items-center rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-sky-100 uppercase'>
              {appSubtitle}
            </span>
            <div className='space-y-3'>
              <h1 className='text-3xl lg:text-4xl font-semibold leading-tight'>{heroTitle}</h1>
              <p className='text-slate-300 text-base lg:text-lg leading-7 max-w-xl'>{heroSubtitle}</p>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
              <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                <div className='text-sky-200 font-medium mb-1'>共通ログイン</div>
                <div className='text-slate-300'>他アプリでも再利用できる共通認証UIです。</div>
              </div>
              <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                <div className='text-sky-200 font-medium mb-1'>テナント切替</div>
                <div className='text-slate-300'>共通DBからテナント情報を読み、適切なDBに接続します。</div>
              </div>
            </div>
          </div>
        </section>

        <section className='rounded-[2rem] border border-slate-200 bg-white shadow-2xl p-6 sm:p-8 lg:p-10'>
          <div className='mb-8 space-y-2'>
            <p className='text-sm font-semibold tracking-[0.24em] text-sky-600 uppercase'>{appTitle}</p>
            <h2 className='text-2xl font-semibold text-slate-900'>ログイン</h2>
            <p className='text-slate-600'>ID / パスワードを入力して続行してください。</p>
            {tenantId ? <p className='text-xs text-slate-400'>tenant_id: {tenantId}</p> : null}
          </div>

          <form onSubmit={handleSubmit} className='space-y-5'>
            <div className='space-y-2'>
              <label className='block text-sm font-medium text-slate-700' htmlFor='username'>
                ユーザー名
              </label>
              <input
                id='username'
                name='username'
                value={username}
                onChange={event => setUsername(event.target.value)}
                autoComplete='username'
                className='w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
                placeholder='ユーザー名を入力'
                disabled={isSubmitting}
              />
            </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-slate-700' htmlFor='password'>
                パスワード
              </label>
              <input
                id='password'
                name='password'
                type='password'
                value={password}
                onChange={event => setPassword(event.target.value)}
                autoComplete='current-password'
                className='w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100'
                placeholder='パスワードを入力'
                disabled={isSubmitting}
              />
            </div>

            {errorMessage ? (
              <div className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
                {errorMessage}
              </div>
            ) : null}

            <button
              type='submit'
              disabled={isSubmitting}
              className='w-full rounded-2xl bg-slate-950 px-4 py-3.5 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {isSubmitting ? 'ログイン中...' : 'ログインして続行'}
            </button>
          </form>

          <p className='mt-6 text-xs leading-6 text-slate-500'>
            この画面は共通ビューとして他アプリでも再利用できます。appId = {appId}
          </p>
        </section>
      </div>
    </div>
  );
}