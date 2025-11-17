import React, { useState, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';
import { databaseService } from '../../services/indexedDB';
import './ColorPicker.css';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onRecentColorsChange?: (colors: string[]) => void;
  reloadTrigger?: number; // Pour forcer le rechargement
}

const MAX_RECENT_COLORS = 10;

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, onRecentColorsChange, reloadTrigger }) => {
  const [recentColors, setRecentColors] = useState<string[]>([]);

  // Charger les couleurs récentes depuis IndexedDB au montage et lors du changement de reloadTrigger
  useEffect(() => {
    const loadRecentColors = async () => {
      try {
        const colors = await databaseService.getRecentColors(MAX_RECENT_COLORS);
        setRecentColors(colors);
        if (onRecentColorsChange) {
          onRecentColorsChange(colors);
        }
      } catch (e) {
        console.error('Erreur lors du chargement des couleurs récentes:', e);
      }
    };
    loadRecentColors();
  }, [onRecentColorsChange, reloadTrigger]);

  const handleColorChange = (newColor: string) => {
    onChange(newColor);
    // Ne pas sauvegarder automatiquement - sera fait lors de la validation
  };

  const handleRecentColorClick = (recentColor: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(recentColor);
  };

  const handleRemoveRecentColor = async (recentColor: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await databaseService.removeRecentColor(recentColor);
      // Recharger les couleurs récentes
      const colors = await databaseService.getRecentColors(MAX_RECENT_COLORS);
      setRecentColors(colors);
      if (onRecentColorsChange) {
        onRecentColorsChange(colors);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la couleur récente:', error);
    }
  };

  return (
    <div className="color-picker-wrapper">
      <HexColorPicker color={color} onChange={handleColorChange} />
      {recentColors.length > 0 && (
        <div className="recent-colors">
          <div className="recent-colors-label">Couleurs récentes</div>
          <div className="recent-colors-grid">
            {recentColors.map((recentColor, index) => (
              <div
                key={`${recentColor}-${index}`}
                className="recent-color-wrapper"
              >
                <button
                  className={`recent-color-item ${color === recentColor ? 'selected' : ''}`}
                  style={{ backgroundColor: recentColor }}
                  onClick={(e) => handleRecentColorClick(recentColor, e)}
                  title={recentColor}
                />
                <button
                  className="recent-color-remove"
                  onClick={(e) => handleRemoveRecentColor(recentColor, e)}
                  title="Supprimer cette couleur"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;

