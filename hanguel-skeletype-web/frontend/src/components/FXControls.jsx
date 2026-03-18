import { useState, useCallback } from 'react';
import useFontStore from '../stores/fontStore';
import EffectPopover from './effects/EffectPopover';
import ConnectionControls from './effects/ConnectionControls';
import BranchControls from './effects/BranchControls';
import DecoratorControls from './effects/DecoratorControls';
import OffsetPathControls from './effects/OffsetPathControls';
import SlantControls from './effects/SlantControls';
import BackgroundImageControls from './effects/BackgroundImageControls';

export default function FXControls() {
  const {
    strokeParams, setStrokeParams,
    connectionParams, toggleConnection, resetConnection,
    branchParams, toggleBranch, resetBranch,
    decoratorParams, toggleDecorator, resetDecorator,
    offsetPathParams, toggleOffsetPath, resetOffsetPath,
    slantParams, toggleSlant, resetSlant,
    backgroundImageParams, toggleBackgroundImage, resetBackgroundImage,
  } = useFontStore();

  const chipInactive = 'bg-[#d9d9d9] text-gray-600 hover:bg-[#c9c9c9]';

  const [showConnPopover, setShowConnPopover] = useState(false);
  const [showBranchPopover, setShowBranchPopover] = useState(false);
  const [showDecoratorPopover, setShowDecoratorPopover] = useState(false);
  const [showOffsetPopover, setShowOffsetPopover] = useState(false);
  const [showSlantPopover, setShowSlantPopover] = useState(false);
  const [showBgPopover, setShowBgPopover] = useState(false);

  const closeConnPopover = useCallback(() => setShowConnPopover(false), []);
  const closeBranchPopover = useCallback(() => setShowBranchPopover(false), []);
  const closeDecoratorPopover = useCallback(() => setShowDecoratorPopover(false), []);
  const closeOffsetPopover = useCallback(() => setShowOffsetPopover(false), []);
  const closeSlantPopover = useCallback(() => setShowSlantPopover(false), []);
  const closeBgPopover = useCallback(() => setShowBgPopover(false), []);

  function handleConnClick() {
    if (!connectionParams.enabled) {
      toggleConnection();
      setShowConnPopover(true);
    } else if (showConnPopover) {
      toggleConnection();
      setShowConnPopover(false);
    } else {
      setShowConnPopover(true);
    }
  }

  function handleBranchClick() {
    if (!branchParams.enabled) {
      toggleBranch();
      setShowBranchPopover(true);
    } else if (showBranchPopover) {
      toggleBranch();
      setShowBranchPopover(false);
    } else {
      setShowBranchPopover(true);
    }
  }

  function handleDecoratorClick() {
    if (!decoratorParams.enabled) {
      toggleDecorator();
      setShowDecoratorPopover(true);
    } else if (showDecoratorPopover) {
      toggleDecorator();
      setShowDecoratorPopover(false);
    } else {
      setShowDecoratorPopover(true);
    }
  }

  function handleOffsetClick() {
    if (!offsetPathParams.enabled) {
      toggleOffsetPath();
      setShowOffsetPopover(true);
    } else if (showOffsetPopover) {
      toggleOffsetPath();
      setShowOffsetPopover(false);
    } else {
      setShowOffsetPopover(true);
    }
  }

  function handleSlantClick() {
    if (!slantParams.enabled) {
      toggleSlant();
      setShowSlantPopover(true);
    } else if (showSlantPopover) {
      toggleSlant();
      setShowSlantPopover(false);
    } else {
      setShowSlantPopover(true);
    }
  }

  function handleBgClick() {
    if (!backgroundImageParams.enabled) {
      toggleBackgroundImage();
      setShowBgPopover(true);
    } else if (showBgPopover) {
      toggleBackgroundImage();
      setShowBgPopover(false);
    } else {
      setShowBgPopover(true);
    }
  }

  function handleReset() {
    resetConnection();
    resetBranch();
    resetDecorator();
    resetOffsetPath();
    resetSlant();
    resetBackgroundImage();
    setShowConnPopover(false);
    setShowBranchPopover(false);
    setShowDecoratorPopover(false);
    setShowOffsetPopover(false);
    setShowSlantPopover(false);
    setShowBgPopover(false);
  }

  return (
    <div className="relative flex items-center gap-[10px] justify-start">
      {/* X-Scale */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-500">Width</span>
        <input
          type="range"
          min={0.2}
          max={1.8}
          step={0.05}
          value={strokeParams.scaleX}
          onChange={(e) => setStrokeParams({ scaleX: +e.target.value })}
          className="w-16 h-1 slider-white appearance-none bg-transparent"
        />
      </div>

      {/* Y-Scale */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-gray-500">Height</span>
        <input
          type="range"
          min={0.2}
          max={1.8}
          step={0.05}
          value={strokeParams.scaleY}
          onChange={(e) => setStrokeParams({ scaleY: +e.target.value })}
          className="w-16 h-1 slider-white appearance-none bg-transparent"
        />
      </div>

      {/* Decorator */}
      <div className="relative shrink-0">
        <button
          onClick={handleDecoratorClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            decoratorParams.enabled
              ? 'bg-[#FF5714] text-white'
              : chipInactive
          }`}
        >
          Decorator
        </button>

        {showDecoratorPopover && decoratorParams.enabled && (
          <EffectPopover onClose={closeDecoratorPopover}>
            <DecoratorControls />
          </EffectPopover>
        )}
      </div>

      {/* Connect */}
      <div className="relative shrink-0">
        <button
          onClick={handleConnClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            connectionParams.enabled
              ? 'bg-[#FF5714] text-white'
              : chipInactive
          }`}
        >
          Connect
        </button>

        {showConnPopover && connectionParams.enabled && (
          <EffectPopover onClose={closeConnPopover}>
            <ConnectionControls />
          </EffectPopover>
        )}
      </div>

      {/* Branch */}
      <div className="relative shrink-0">
        <button
          onClick={handleBranchClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            branchParams.enabled
              ? 'bg-[#FF5714] text-white'
              : chipInactive
          }`}
        >
          Branch
        </button>

        {showBranchPopover && branchParams.enabled && (
          <EffectPopover onClose={closeBranchPopover}>
            <BranchControls />
          </EffectPopover>
        )}
      </div>

      {/* Offset Path */}
      <div className="relative shrink-0">
        <button
          onClick={handleOffsetClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            offsetPathParams.enabled
              ? 'bg-[#FF5714] text-white'
              : chipInactive
          }`}
        >
          Offset
        </button>

        {showOffsetPopover && offsetPathParams.enabled && (
          <EffectPopover onClose={closeOffsetPopover}>
            <OffsetPathControls />
          </EffectPopover>
        )}
      </div>

      {/* Slant */}
      <div className="relative shrink-0">
        <button
          onClick={handleSlantClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            slantParams.enabled
              ? 'bg-[#FF5714] text-white'
              : chipInactive
          }`}
        >
          Slant
        </button>

        {showSlantPopover && slantParams.enabled && (
          <EffectPopover onClose={closeSlantPopover}>
            <SlantControls />
          </EffectPopover>
        )}
      </div>

      {/* Background Image */}
      <div className="relative shrink-0">
        <button
          onClick={handleBgClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            backgroundImageParams.enabled
              ? 'bg-[#FF5714] text-white'
              : chipInactive
          }`}
        >
          Image
        </button>

        {showBgPopover && backgroundImageParams.enabled && (
          <EffectPopover onClose={closeBgPopover}>
            <BackgroundImageControls />
          </EffectPopover>
        )}
      </div>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-gray-400 hover:bg-gray-500 text-white rounded-full transition-colors"
      >
        Reset
      </button>
    </div>
  );
}
