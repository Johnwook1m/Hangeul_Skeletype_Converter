import { useState, useCallback } from 'react';
import useFontStore from '../stores/fontStore';
import EffectPopover from './effects/EffectPopover';
import ConnectionControls from './effects/ConnectionControls';
import BranchControls from './effects/BranchControls';
import DecoratorControls from './effects/DecoratorControls';
import OffsetPathControls from './effects/OffsetPathControls';
import SlantControls from './effects/SlantControls';

export default function FXControls() {
  const {
    connectionParams, toggleConnection, resetConnection,
    branchParams, toggleBranch, resetBranch,
    decoratorParams, toggleDecorator, resetDecorator,
    offsetPathParams, toggleOffsetPath, resetOffsetPath,
    slantParams, toggleSlant, resetSlant,
  } = useFontStore();

  const [showConnPopover, setShowConnPopover] = useState(false);
  const [showBranchPopover, setShowBranchPopover] = useState(false);
  const [showDecoratorPopover, setShowDecoratorPopover] = useState(false);
  const [showOffsetPopover, setShowOffsetPopover] = useState(false);
  const [showSlantPopover, setShowSlantPopover] = useState(false);

  const closeConnPopover = useCallback(() => setShowConnPopover(false), []);
  const closeBranchPopover = useCallback(() => setShowBranchPopover(false), []);
  const closeDecoratorPopover = useCallback(() => setShowDecoratorPopover(false), []);
  const closeOffsetPopover = useCallback(() => setShowOffsetPopover(false), []);
  const closeSlantPopover = useCallback(() => setShowSlantPopover(false), []);

  function handleConnClick() {
    if (!connectionParams.enabled) {
      toggleConnection();
      setShowConnPopover(true);
    } else if (showConnPopover) {
      setShowConnPopover(false);
    } else {
      setShowConnPopover(true);
    }
  }

  function handleConnDoubleClick() {
    if (connectionParams.enabled) {
      toggleConnection();
      setShowConnPopover(false);
    }
  }

  function handleBranchClick() {
    if (!branchParams.enabled) {
      toggleBranch();
      setShowBranchPopover(true);
    } else if (showBranchPopover) {
      setShowBranchPopover(false);
    } else {
      setShowBranchPopover(true);
    }
  }

  function handleBranchDoubleClick() {
    if (branchParams.enabled) {
      toggleBranch();
      setShowBranchPopover(false);
    }
  }

  function handleDecoratorClick() {
    if (!decoratorParams.enabled) {
      toggleDecorator();
      setShowDecoratorPopover(true);
    } else if (showDecoratorPopover) {
      setShowDecoratorPopover(false);
    } else {
      setShowDecoratorPopover(true);
    }
  }

  function handleDecoratorDoubleClick() {
    if (decoratorParams.enabled) {
      toggleDecorator();
      setShowDecoratorPopover(false);
    }
  }

  function handleOffsetClick() {
    if (!offsetPathParams.enabled) {
      toggleOffsetPath();
      setShowOffsetPopover(true);
    } else if (showOffsetPopover) {
      setShowOffsetPopover(false);
    } else {
      setShowOffsetPopover(true);
    }
  }

  function handleOffsetDoubleClick() {
    if (offsetPathParams.enabled) {
      toggleOffsetPath();
      setShowOffsetPopover(false);
    }
  }

  function handleSlantClick() {
    if (!slantParams.enabled) {
      toggleSlant();
      setShowSlantPopover(true);
    } else if (showSlantPopover) {
      setShowSlantPopover(false);
    } else {
      setShowSlantPopover(true);
    }
  }

  function handleSlantDoubleClick() {
    if (slantParams.enabled) {
      toggleSlant();
      setShowSlantPopover(false);
    }
  }

  function handleReset() {
    resetConnection();
    resetBranch();
    resetDecorator();
    resetOffsetPath();
    resetSlant();
    setShowConnPopover(false);
    setShowBranchPopover(false);
    setShowDecoratorPopover(false);
    setShowOffsetPopover(false);
    setShowSlantPopover(false);
  }

  return (
    <div className="relative flex items-center gap-1 min-h-[52px] justify-start">
      {/* Connect */}
      <div className="relative shrink-0">
        <button
          onClick={handleConnClick}
          onDoubleClick={handleConnDoubleClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            connectionParams.enabled
              ? 'bg-[#0cd0fc] text-white'
              : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
          }`}
          title={connectionParams.enabled ? 'Click: settings / Double-click: off' : 'Click: enable'}
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
          onDoubleClick={handleBranchDoubleClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            branchParams.enabled
              ? 'bg-[#0cd0fc] text-white'
              : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
          }`}
          title={branchParams.enabled ? 'Click: settings / Double-click: off' : 'Click: enable'}
        >
          Branch
        </button>

        {showBranchPopover && branchParams.enabled && (
          <EffectPopover onClose={closeBranchPopover}>
            <BranchControls />
          </EffectPopover>
        )}
      </div>

      {/* Decorator */}
      <div className="relative shrink-0">
        <button
          onClick={handleDecoratorClick}
          onDoubleClick={handleDecoratorDoubleClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            decoratorParams.enabled
              ? 'bg-[#0cd0fc] text-white'
              : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
          }`}
          title={decoratorParams.enabled ? 'Click: settings / Double-click: off' : 'Click: enable'}
        >
          Decorator
        </button>

        {showDecoratorPopover && decoratorParams.enabled && (
          <EffectPopover onClose={closeDecoratorPopover}>
            <DecoratorControls />
          </EffectPopover>
        )}
      </div>

      {/* Offset Path */}
      <div className="relative shrink-0">
        <button
          onClick={handleOffsetClick}
          onDoubleClick={handleOffsetDoubleClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            offsetPathParams.enabled
              ? 'bg-[#0cd0fc] text-white'
              : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
          }`}
          title={offsetPathParams.enabled ? 'Click: settings / Double-click: off' : 'Click: enable'}
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
          onDoubleClick={handleSlantDoubleClick}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            slantParams.enabled
              ? 'bg-[#0cd0fc] text-white'
              : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
          }`}
          title={slantParams.enabled ? 'Click: settings / Double-click: off' : 'Click: enable'}
        >
          Slant
        </button>

        {showSlantPopover && slantParams.enabled && (
          <EffectPopover onClose={closeSlantPopover}>
            <SlantControls />
          </EffectPopover>
        )}
      </div>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="shrink-0 px-2.5 py-1.5 text-xs font-medium bg-gray-400 hover:bg-gray-500 text-white rounded-full transition-colors"
        title="모든 이펙트 초기화"
      >
        Reset
      </button>
    </div>
  );
}
