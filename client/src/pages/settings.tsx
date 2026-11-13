import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { Settings, Volume2, Save } from 'lucide-react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [textToSpeech, setTextToSpeech] = useState(true);
  const [speechVolume, setSpeechVolume] = useState([80]);
  const [darkMode, setDarkMode] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [useOnlyKnowledgeBase, setUseOnlyKnowledgeBase] = useState(true);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('emergencyRecoverySettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.notifications !== undefined)
          setNotifications(settings.notifications);
        if (settings.textToSpeech !== undefined)
          setTextToSpeech(settings.textToSpeech);
        if (settings.speechVolume !== undefined)
          setSpeechVolume(settings.speechVolume);
        if (settings.darkMode !== undefined) setDarkMode(settings.darkMode);
        if (settings.autoSave !== undefined) setAutoSave(settings.autoSave);
        if (settings.useOnlyKnowledgeBase !== undefined)
          setUseOnlyKnowledgeBase(settings.useOnlyKnowledgeBase);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
    }
  }, []);

  const saveSettings = () => {
    try {
      const settings = {
        notifications,
        textToSpeech,
        speechVolume,
        darkMode,
        autoSave,
        useOnlyKnowledgeBase,
      };
      localStorage.setItem(
        'emergencyRecoverySettings',
        JSON.stringify(settings)
      );
      localStorage.setItem(
        'useOnlyKnowledgeBase',
        useOnlyKnowledgeBase.toString()
      );
      window.dispatchEvent(
        new CustomEvent('settingsChanged', { detail: settings })
      );
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
    }
  };

  useEffect(() => {
    saveSettings();
  }, [
    notifications,
    textToSpeech,
    speechVolume,
    darkMode,
    autoSave,
    useOnlyKnowledgeBase,
  ]);

  return (
    <div className='flex-1 overflow-y-auto p-4 md:p-6 max-w-5xl mx-auto w-full bg-gradient-to-br from-blue-50 to-indigo-50'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent'>
          <Settings className='mr-2 h-6 w-6 text-indigo-500' />
          設定
        </h1>
        <p className='text-blue-400'>アプリケーションの設定を管理します</p>
      </div>

      <Card className='border border-blue-200 shadow-md overflow-hidden'>
        <CardHeader className='pb-2 bg-gradient-to-r from-indigo-500 to-blue-600 text-white'>
          <CardTitle className='text-lg flex items-center'>
            <Settings className='mr-2 h-5 w-5' />
            アプリ設定
          </CardTitle>
        </CardHeader>
        <CardContent className='bg-white'>
          <div className='space-y-4'>
            <div className='flex items-center justify-between py-2'>
              <div>
                <p className='font-medium text-blue-700'>通知を有効にする</p>
                <p className='text-sm text-blue-400'>新しいメッセージの通知を受け取る</p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
                className='data-[state=checked]:bg-blue-500'
              />
            </div>

            <div className='flex items-center justify-between py-2 border-t border-blue-100 pt-3'>
              <div>
                <p className='font-medium text-blue-700'>音声読み上げ</p>
                <p className='text-sm text-blue-400'>AI応答を音声で読み上げる</p>
              </div>
              <Switch
                checked={textToSpeech}
                onCheckedChange={setTextToSpeech}
                className='data-[state=checked]:bg-blue-500'
              />
            </div>

            {textToSpeech && (
              <div className='py-2 border-t border-blue-100 pt-3'>
                <p className='font-medium mb-2 text-blue-700'>音声の音量</p>
                <Slider
                  value={speechVolume}
                  onValueChange={setSpeechVolume}
                  max={100}
                  step={1}
                  className='data-[state=checked]:bg-blue-500'
                />
                <div className='flex justify-between mt-1'>
                  <Volume2 className='h-4 w-4 text-blue-400' />
                  <span className='text-sm text-blue-500 font-medium'>{speechVolume[0]}%</span>
                </div>
              </div>
            )}

            <div className='flex items-center justify-between py-2 border-t border-blue-100 pt-3'>
              <div>
                <p className='font-medium text-indigo-700'>ダークモード</p>
                <p className='text-sm text-indigo-400'>暗い色のテーマを使用する</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
                className='data-[state=checked]:bg-indigo-500'
              />
            </div>

            <div className='flex items-center justify-between py-2 border-t border-blue-100 pt-3'>
              <div>
                <p className='font-medium text-indigo-700'>自動保存</p>
                <p className='text-sm text-indigo-400'>会話を自動的に保存する</p>
              </div>
              <Switch
                checked={autoSave}
                onCheckedChange={setAutoSave}
                className='data-[state=checked]:bg-indigo-500'
              />
            </div>

            <div className='flex items-center justify-between py-2 border-t border-blue-100 pt-3'>
              <div>
                <p className='font-medium text-indigo-700'>独自の技術資料のみを使用</p>
                <p className='text-sm text-indigo-400'>AI応答に登録済みナレッジのみを使用する</p>
              </div>
              <Switch
                checked={useOnlyKnowledgeBase}
                onCheckedChange={setUseOnlyKnowledgeBase}
                className='data-[state=checked]:bg-indigo-500'
              />
            </div>

            <div className='py-2 border-t border-blue-100 pt-3 flex justify-end'>
              <Button
                onClick={saveSettings}
                className='bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
              >
                <Save className='mr-2 h-4 w-4' />
                設定を保存
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
