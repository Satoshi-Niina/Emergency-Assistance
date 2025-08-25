import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';

export default function SignIn() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      console.log('柏 繧ｵ繧､繝ｳ繧､繝ｳ繝壹・繧ｸ: 繝ｭ繧ｰ繧､繝ｳ蜃ｦ逅・幕蟋・);
      await login(username, password);
      console.log('笨・繧ｵ繧､繝ｳ繧､繝ｳ繝壹・繧ｸ: 繝ｭ繧ｰ繧､繝ｳ謌仙粥縲√メ繝｣繝・ヨ繝壹・繧ｸ縺ｫ驕ｷ遘ｻ');
      navigate('/chat');
    } catch (error) {
      console.error('笶・繧ｵ繧､繝ｳ繧､繝ｳ繝壹・繧ｸ: 繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｩ繝ｼ:', error);
      setError(error instanceof Error ? error.message : '繝ｭ繧ｰ繧､繝ｳ縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">繝ｭ繧ｰ繧､繝ｳ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            <div>
              <Input
                type="text"
                placeholder="繝ｦ繝ｼ繧ｶ繝ｼ蜷・
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="繝代せ繝ｯ繝ｼ繝・
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '繝ｭ繧ｰ繧､繝ｳ荳ｭ...' : '繝ｭ繧ｰ繧､繝ｳ'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 