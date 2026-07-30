import { Product } from '../types';

export const INITIAL_MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    title: 'Smart Noise-Canceling Wireless Ergonomic Headphones Pro',
    subtitle: 'Hi-Fi Audio with 40-Hour Battery & Adaptive Active Noise Cancellation',
    sku: 'AUDIO-ANC-PRO-01',
    categories: ['Consumer Electronics', 'Audio & Headphones', 'Wireless Audio'],
    tags: ['Noise Canceling', 'Bluetooth 5.3', 'Long Battery', 'Bestseller', 'AI Optimized'],
    status: 'published',
    mainImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    optimizedMainImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    whiteBgImage: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80'
    ],
    price: 189.99,
    promoPrice: 149.99,
    costPrice: 42.50,
    estimatedMargin: 71.6,
    stock: 120,
    weight: 0.28,
    dimensions: { length: 18, width: 15, height: 8, unit: 'cm' },
    sellingPoints: [
      '45dB Hybrid Active Noise Cancellation for immersive deep focus',
      'Custom 40mm Titanium Drivers delivering crystal-clear Hi-Res audio',
      'Fast Charging: 10 minutes charge gives 5 hours of playback',
      'Ultra-soft memory foam ear cushions for all-day wearing comfort',
      'Dual mic Environmental Noise Cancellation for crystal clear calls'
    ],
    shortDescription: 'Enterprise-grade wireless headphones with active noise cancellation, 40h battery, memory foam comfort, and Hi-Res wireless audio certified.',
    longDescription: `<h3>Unmatched Sound Clarity & Deep Focus</h3>
<p>Experience studio-grade audio quality with our flagship <strong>Smart Noise-Canceling Headphones Pro</strong>. Powered by advanced custom 40mm titanium drivers and real-time adaptive noise cancellation algorithms, it blocks out 98.5% of ambient environment noise, allowing you to focus on your music, work, or voice calls.</p>
<h4>Key Features:</h4>
<ul>
  <li><strong>Hybrid ANC Technology:</strong> Dual microphones capture external noise before it reaches your ear.</li>
  <li><strong>Ergonomic Cloud Cushion:</strong> Breathable protein leather with memory foam fit.</li>
  <li><strong>Seamless Multipoint Connection:</strong> Switch effortlessly between your phone and laptop.</li>
</ul>`,
    parameters: [
      { name: 'Bluetooth Version', value: '5.3' },
      { name: 'Battery Capacity', value: '800 mAh' },
      { name: 'Charging Port', value: 'USB Type-C' },
      { name: 'ANC Depth', value: '-45 dB' },
      { name: 'Driver Size', value: '40 mm' }
    ],
    usageInstructions: 'Press and hold power button for 3 seconds to pair via Bluetooth. Double click ANC button to switch between Noise Canceling, Ambient Mode, and Standard Mode.',
    cautions: 'Do not expose to extreme heat or submerge in water. Clean cushion surface with dry soft cloth.',
    seo: {
      title: 'Smart Noise-Canceling Wireless Headphones Pro - High Performance Audio',
      keywords: ['Wireless Headphones', 'ANC Headphones', 'Bluetooth Headphones', 'Hi-Fi Audio'],
      metaDescription: 'Shop Smart Noise-Canceling Headphones Pro. 40-hour battery, 45dB hybrid ANC, memory foam cushions & fast charging. Free shipping available.',
      slug: 'smart-noise-canceling-wireless-headphones-pro'
    },
    source: { type: 'upload' },
    wcProductId: 1042,
    wcPermalink: 'https://demo-store.woocommerce.com/product/smart-anc-headphones-pro',
    createdAt: '2026-07-22T10:15:00Z',
    updatedAt: '2026-07-23T11:00:00Z'
  },
  {
    id: 'prod-002',
    title: 'Ergonomic Mesh High-Back Office Gaming Chair',
    subtitle: 'Dynamic Lumbar Support, Adjustable Armrests & 3D Breathable Mesh',
    sku: 'FURN-ERGO-CHAIR-02',
    categories: ['Home & Office Furniture', 'Ergonomic Chairs'],
    tags: ['Ergonomic', 'Mesh Chair', 'Lumbar Support', 'Office Essential'],
    status: 'ready',
    mainImage: 'https://images.unsplash.com/photo-1580481072645-022f9a6d1270?auto=format&fit=crop&w=800&q=80',
    optimizedMainImage: 'https://images.unsplash.com/photo-1580481072645-022f9a6d1270?auto=format&fit=crop&w=800&q=80',
    whiteBgImage: 'https://images.unsplash.com/photo-1580481072645-022f9a6d1270?auto=format&fit=crop&w=800&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=800&q=80'
    ],
    price: 299.00,
    promoPrice: 249.00,
    costPrice: 85.00,
    estimatedMargin: 65.8,
    stock: 45,
    weight: 16.5,
    dimensions: { length: 65, width: 65, height: 120, unit: 'cm' },
    sellingPoints: [
      'Self-adjusting dynamic lumbar cushion fits human spine curvature',
      'High-elasticity Korean 3D mesh keeps back cool all day',
      '3D adjustable armrests (Height, Angle, Depth)',
      'Heavy-duty aluminum base certified up to 350 lbs load capacity'
    ],
    shortDescription: 'Professional ergonomic office chair with breathable mesh, adaptive lower back support, and multi-angle lockable recline.',
    longDescription: `<h3>Designed for All-Day Healthy Posture</h3>
<p>Prevent lower back pain and maintain focus with our premium <strong>Ergonomic Mesh High-Back Chair</strong>. Engineered with human kinetic research, the chair features an intuitive self-adjusting lumbar support system that shifts with your back movements.</p>`,
    parameters: [
      { name: 'Frame Material', value: 'Reinforced Nylon & Aluminum' },
      { name: 'Max Weight Capacity', value: '160 kg / 350 lbs' },
      { name: 'Recline Angle', value: '90° - 135°' },
      { name: 'Gas Lift Standard', value: 'Class 4 TÜV Certified' }
    ],
    usageInstructions: 'Use right lever under seat to adjust height. Pull lever outward to enable rocking/recline function.',
    cautions: 'Ensure all assembly screws are tightened properly before sitting.',
    seo: {
      title: 'Ergonomic Mesh High-Back Office Chair with Lumbar Support',
      keywords: ['Ergonomic Chair', 'Office Chair', 'Mesh Chair', 'Gaming Chair'],
      metaDescription: 'Buy Ergonomic High-Back Office Chair with dynamic lower back lumbar support, 3D mesh, and TÜV certified class 4 gas lift.',
      slug: 'ergonomic-mesh-high-back-office-chair'
    },
    source: { type: 'url', originalUrl: 'https://supplier.1688.com/item/69382101' },
    createdAt: '2026-07-23T08:30:00Z',
    updatedAt: '2026-07-23T11:20:00Z'
  },
  {
    id: 'prod-003',
    title: 'Compact Electric Espresso Coffee Maker 20 Bar Pump',
    subtitle: 'Portable Espresso Machine for Home, Office & Travel Coffee Lovers',
    sku: 'KITCHEN-ESPRESSO-03',
    categories: ['Home & Kitchen', 'Coffee Machines', 'Small Appliances'],
    tags: ['Espresso', 'Coffee Maker', '20 Bar Pump', 'Hot Sale'],
    status: 'pending_review',
    mainImage: 'https://images.unsplash.com/photo-1517668808822-9a04294d1a58?auto=format&fit=crop&w=800&q=80',
    galleryImages: [],
    price: 119.50,
    promoPrice: 89.90,
    costPrice: 28.00,
    estimatedMargin: 68.8,
    stock: 80,
    weight: 2.8,
    dimensions: { length: 22, width: 14, height: 28, unit: 'cm' },
    sellingPoints: [
      '20-Bar high pressure pump extracts rich golden crema',
      'Rapid Thermo-block heating reaches 92°C extraction in 25 seconds',
      'Compatible with both ground coffee powder and standard espresso pods',
      'Ultra-compact width takes minimal kitchen counter space'
    ],
    shortDescription: 'Compact 20-bar pump espresso maker engineered for rich crema and cafe-quality espresso at home or office.',
    longDescription: `<h3>Bring the Italian Coffee House Experience Home</h3>
<p>Enjoy rich, authentic espresso anytime with this compact 20-bar high pressure coffee machine. Built with rapid Thermo-block temperature control for consistent crema every single cup.</p>`,
    parameters: [
      { name: 'Pump Pressure', value: '20 Bar Italian Pump' },
      { name: 'Water Tank Capacity', value: '1.2 Liters' },
      { name: 'Power Rating', value: '1350 W' }
    ],
    usageInstructions: 'Fill water tank with fresh water. Add ground coffee to portafilter, tamp lightly, attach portafilter and press cup size button.',
    cautions: 'Descale machine water tank every 2-3 months to prevent mineral buildup.',
    seo: {
      title: '20 Bar Compact Electric Espresso Coffee Maker - Italian Crema',
      keywords: ['Espresso Machine', 'Coffee Maker', '20 Bar Espresso', 'Kitchen Appliance'],
      metaDescription: 'Extract rich cafe-quality espresso with 20-bar pump pressure, 25s fast heating, and compact counter footprint.',
      slug: 'compact-20-bar-electric-espresso-maker'
    },
    source: { type: 'crawler', originalUrl: 'https://amazon.com/dp/B08XPRESS0' },
    createdAt: '2026-07-23T09:45:00Z',
    updatedAt: '2026-07-23T12:00:00Z'
  }
];
