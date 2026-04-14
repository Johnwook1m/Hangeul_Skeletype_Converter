/**
 * Derives a human-readable list of enabled features from the current Zustand state.
 * Checks all visible layers so the summary reflects the full artwork.
 */
export function extractFeaturesUsed({ layers, backgroundImages, mixMode }) {
  const featureSet = new Set();

  if (backgroundImages.some((img) => img.enabled && img.imageUrl)) {
    featureSet.add('Background Image');
  }
  if (mixMode) {
    featureSet.add('Mix Mode');
  }

  for (const layer of layers) {
    if (!layer.visible) continue;
    if (layer.slantParams?.enabled)       featureSet.add('Slant');
    if (layer.connectionParams?.enabled)  featureSet.add('Connection');
    if (layer.branchParams?.enabled)      featureSet.add('Branch');
    if (layer.decoratorParams?.enabled)   featureSet.add('Decorator');
    if (layer.offsetPathParams?.enabled)  featureSet.add('Offset Path');

    const sp = layer.strokeParams ?? {};
    if ((sp.scaleX ?? 1) !== 1) featureSet.add('Width Scale');
    if ((sp.scaleY ?? 1) !== 1) featureSet.add('Height Scale');
  }

  if (layers.length > 1) {
    featureSet.add(`${layers.length} Layers`);
  }

  return [...featureSet];
}

/**
 * Builds a serialisable settings snapshot from current store state.
 * Strips blob imageUrls (session-only, non-replayable).
 */
export function buildSettingsSnapshot({
  fontName, previewText, bgColor, theme, textAlign,
  showFlesh, glyphSize, layers, backgroundImages, mixMode, mixSeed,
}) {
  const safeImages = backgroundImages.map(({ imageUrl, ...rest }) => rest);
  return {
    fontName, previewText, bgColor, theme, textAlign,
    showFlesh, glyphSize, mixMode, mixSeed,
    layers,
    backgroundImages: safeImages,
  };
}
