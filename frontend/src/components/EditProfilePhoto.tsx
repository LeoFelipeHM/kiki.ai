import { ArrowLeft, Camera, Upload } from 'lucide-react';
import { backNavButtonClassName } from '@/lib/backNavButton';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';

interface EditProfilePhotoProps {
  onNavigateBack?: () => void;
  onSaveColor?: (color: string) => void;
  currentColor?: string;
  userName?: string;
}

export function EditProfilePhoto({ onNavigateBack, onSaveColor, currentColor = 'from-purple-500 to-pink-500', userName = 'Maria Silva' }: EditProfilePhotoProps) {
  const { themeColor } = useTheme();
  const [selectedColor, setSelectedColor] = useState(currentColor);

  const handleSave = () => {
    onSaveColor?.(selectedColor);
    onNavigateBack?.();
  };

  const colorOptions = [
    { name: 'Roxo & Rosa', gradient: 'from-purple-500 to-pink-500' },
    { name: 'Azul & Ciano', gradient: 'from-blue-500 to-cyan-500' },
    { name: 'Verde & Esmeralda', gradient: 'from-green-500 to-emerald-500' },
    { name: 'Laranja & Vermelho', gradient: 'from-orange-500 to-red-500' },
    { name: 'Rosa & Vermelho', gradient: 'from-pink-500 to-red-500' },
    { name: 'Índigo & Roxo', gradient: 'from-indigo-500 to-purple-500' },
  ];

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="px-5 pt-8 pb-4">
        <button type="button" onClick={onNavigateBack} className={`${backNavButtonClassName} mb-6`}>
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar</span>
        </button>

        <h1 className="text-2xl mb-2">Foto de Perfil</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Personalize sua foto de perfil
        </p>

        {/* Preview */}
        <div className="flex flex-col items-center mb-8">
          <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${selectedColor} flex items-center justify-center text-4xl text-white shadow-2xl mb-4`}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm text-muted-foreground">{userName}</p>
        </div>

        {/* Upload Options */}
        <div className="space-y-3 mb-6">
          <button className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-purple-500 hover:bg-purple-50 transition-all btn-apple`}>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center`}>
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Tirar foto</p>
              <p className="text-xs text-muted-foreground">Use a câmera do dispositivo</p>
            </div>
          </button>

          <button className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-purple-500 hover:bg-purple-50 transition-all btn-apple`}>
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center`}>
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium">Fazer upload</p>
              <p className="text-xs text-muted-foreground">Escolha da galeria</p>
            </div>
          </button>
        </div>

        {/* Color Selection */}
        <div>
          <h3 className="text-sm font-medium mb-3">Ou escolha uma cor</h3>
          <div className="grid grid-cols-3 gap-3">
            {colorOptions.map((option) => (
              <button
                key={option.gradient}
                onClick={() => setSelectedColor(option.gradient)}
                className={`relative aspect-square rounded-xl bg-gradient-to-br ${option.gradient} transition-all btn-apple ${
                  selectedColor === option.gradient ? 'ring-4 ring-purple-500 ring-offset-2' : ''
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto p-5">
        <button
          onClick={handleSave}
          className={`w-full bg-gradient-to-br ${themeColor} text-white py-4 rounded-full font-semibold flex items-center justify-center gap-2 btn-apple-gradient shadow-lg hover:shadow-xl transition-all`}
        >
          Salvar foto
        </button>
      </div>
    </div>
  );
}
