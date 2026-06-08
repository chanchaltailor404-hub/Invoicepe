import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Modern, premium, PhonePe-inspired InvoicePe Icon with orange-deep red gradient, solid design,
// white "I" + integrated "₹" monogram, smooth 3D drop shadows, and an elegant folded-paper corner flap.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient: Vibrant modern fintech orange with premium depth -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF8A00" />
      <stop offset="60%" stop-color="#FF5C00" />
      <stop offset="100%" stop-color="#D62400" />
    </linearGradient>

    <!-- Fold Flap Gradient: Light catching reflection on the paper fold -->
    <linearGradient id="foldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.32" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0" />
    </linearGradient>

    <!-- Drop Shadow Filter for the Monogram and the Fold Flap to give maximum premium look -->
    <filter id="monogramShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#7C1200" flood-opacity="0.45" />
    </filter>

    <filter id="foldShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="-4" dy="6" stdDeviation="6" flood-color="#500900" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Base Card with high-quality rounded squircle -->
  <clipPath id="cardClip">
    <rect x="0" y="0" width="512" height="512" rx="124" />
  </clipPath>

  <g clip-path="url(#cardClip)">
    <!-- Vibrant Base Gradient Background -->
    <rect x="0" y="0" width="512" height="512" fill="url(#bgGrad)" />

    <!-- Subtle background pattern or light highlight (diagonal shine) -->
    <path d="M -100,200 L 400,-100 L 600,-100 L 100,400 Z" fill="#FFFFFF" opacity="0.05" />

    <!-- Darker backing wedge underneath the folded corner to give paper thickness -->
    <path d="M 390,-5 L 512,117 L 512,-5 Z" fill="#9e1800" opacity="0.5" />

    <!-- Pure White Integrated "I" + "₹" Monogram with floating drop shadow -->
    <g filter="url(#monogramShadow)">
      <!-- The vertical "I" trunk -->
      <rect x="224" y="112" width="64" height="288" rx="32" fill="#FFFFFF" />

      <!-- Rupee Top Bar (crosses the I trunk) -->
      <rect x="160" y="156" width="156" height="24" rx="12" fill="#FFFFFF" />

      <!-- Rupee Middle Bar (crosses the I trunk) -->
      <rect x="160" y="210" width="132" height="24" rx="12" fill="#FFFFFF" />

      <!-- Rupee Curved Loop which seamlessly merges into the bars & I trunk -->
      <path d="M 256,168 C 322,168 322,222 256,222" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" />

      <!-- Rupee Diagonal Slash leg springing gracefully from center intersection -->
      <path d="M 248,224 L 320,324" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" />
    </g>

    <!-- Fold flap in top-right corner, creates a stunning realistic bent-corner detail -->
    <g filter="url(#foldShadow)">
      <path d="M 390,0 L 512,122 L 390,122 Z" fill="url(#foldGrad)" />
      <!-- Subtle fold highlight lines to accent the 3D paper look -->
      <line x1="390" y1="0" x2="390" y2="122" stroke="#FFFFFF" stroke-width="1.5" opacity="0.4" />
      <line x1="390" y1="122" x2="512" y2="122" stroke="#FFFFFF" stroke-width="1.5" opacity="0.4" />
    </g>
  </g>
</svg>
`;

const targets = [
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'apple-touch-icon-precomposed.png', size: 180 },
  { name: 'favicon.ico', size: 48 },
];

async function generate() {
  console.log('Starting modern InvoicePe icon generation...');
  const svgBuffer = Buffer.from(svg);

  for (const target of targets) {
    const dest = path.join('public', target.name);
    console.log(`Generating ${target.name} (${target.size}x${target.size})...`);
    
    await sharp(svgBuffer)
      .resize(target.size, target.size)
      .png()
      .toFile(dest);
      
    console.log(`Successfully written ${dest}`);
  }
  
  console.log('All branding brand asset icons have been regenerated perfectly!');
}

generate().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
