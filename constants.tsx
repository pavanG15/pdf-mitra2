
import { PDFTool, ToolCategory } from './types';

export const TOOLS: PDFTool[] = [
  {
    id: 'id-merge',
    name: 'ID Card Merge',
    description: 'Merge front and back sides of an ID card into a single page PDF.',
    category: ToolCategory.ORGANIZE,
    icon: 'fa-id-card',
    path: '/id-merge',
    color: '#0ea5e9',
    isNew: true
  },
  {
    id: 'merge',
    name: 'Merge PDF',
    description: 'Combine multiple PDFs into one unified document instantly.',
    category: ToolCategory.ORGANIZE,
    icon: 'fa-layer-group',
    path: '/merge',
    color: '#10b981',
    isPopular: true
  },
  {
    id: 'split',
    name: 'Split PDF',
    description: 'Separate pages or extract specific sections from your PDF file.',
    category: ToolCategory.ORGANIZE,
    icon: 'fa-cut',
    path: '/split',
    color: '#f43f5e'
  },
  {
    id: 'extract-pages',
    name: 'Extract Pages',
    description: 'Pull specific pages out of your PDF into a brand new document.',
    category: ToolCategory.ORGANIZE,
    icon: 'fa-file-export',
    path: '/extract-pages',
    color: '#6366f1'
  },
  {
    id: 'delete-pages',
    name: 'Delete Pages',
    description: 'Remove unnecessary pages from your PDF file to keep it clean.',
    category: ToolCategory.ORGANIZE,
    icon: 'fa-trash-alt',
    path: '/delete-pages',
    color: '#f43f5e'
  },
  {
    id: 'crop-pdf',
    name: 'Crop PDF',
    description: 'Trim PDF margins or crop specific areas for cleaner document layout.',
    category: ToolCategory.EDIT,
    icon: 'fa-crop-alt',
    path: '/crop',
    color: '#0d9488'
  },
  {
    id: 'compress',
    name: 'Compress PDF',
    description: 'Optimize file size while preserving high-definition visual quality.',
    category: ToolCategory.OPTIMIZE,
    icon: 'fa-compress-arrows-alt',
    path: '/compress',
    color: '#0ea5e9',
    isPopular: true
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Transform PDFs into fully editable Word documents.',
    category: ToolCategory.CONVERT,
    icon: 'fa-file-word',
    path: '/pdf-to-word',
    color: '#3b82f6',
    isPopular: true
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    description: 'Convert DOCX files to secure, searchable PDF documents.',
    category: ToolCategory.CONVERT,
    icon: 'fa-file-pdf',
    path: '/word-to-pdf',
    color: '#10b981'
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Extract pages from a PDF as high-quality JPG images.',
    category: ToolCategory.CONVERT,
    icon: 'fa-file-image',
    path: '/pdf-to-jpg',
    color: '#f59e0b'
  },
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    description: 'Convert images (JPG, PNG) into a high-quality PDF.',
    category: ToolCategory.CONVERT,
    icon: 'fa-images',
    path: '/jpg-to-pdf',
    color: '#ea580c'
  },
  {
    id: 'scan-to-pdf',
    name: 'Scan to PDF',
    description: 'Use your camera to scan documents directly into a PDF.',
    category: ToolCategory.CONVERT,
    icon: 'fa-camera',
    path: '/scan',
    color: '#0d9488',
    isNew: true
  },
  {
    id: 'rotate',
    name: 'Rotate PDF',
    description: 'Rotate PDF pages exactly how you need them. Fixed in seconds.',
    category: ToolCategory.ORGANIZE,
    icon: 'fa-redo',
    path: '/rotate',
    color: '#6366f1'
  },
  {
    id: 'reorder',
    name: 'Reorder Pages',
    description: 'Rearrange the sequence of pages in your PDF with simple drag-and-drop.',
    category: ToolCategory.ORGANIZE,
    icon: 'fa-sort-amount-down',
    path: '/reorder',
    color: '#8b5cf6'
  },
  {
    id: 'protect',
    name: 'Protect PDF',
    description: 'Apply passwords and encryption to your sensitive PDFs.',
    category: ToolCategory.SECURITY,
    icon: 'fa-lock',
    path: '/protect',
    color: '#8b5cf6'
  },
  {
    id: 'unlock',
    name: 'Unlock PDF',
    description: 'Remove password and security from protected PDF files.',
    category: ToolCategory.SECURITY,
    icon: 'fa-unlock',
    path: '/unlock',
    color: '#ef4444'
  },
  {
    id: 'watermark',
    name: 'Watermark',
    description: 'Add custom text or image stamps to your documents.',
    category: ToolCategory.EDIT,
    icon: 'fa-stamp',
    path: '/watermark',
    color: '#ca8a04'
  },
  {
    id: 'repair',
    name: 'Repair PDF',
    description: 'Attempt to restore content from corrupt or damaged PDF documents.',
    category: ToolCategory.OPTIMIZE,
    icon: 'fa-tools',
    path: '/repair',
    color: '#64748b'
  },
  {
    id: 'numbering',
    name: 'Page Numbers',
    description: 'Add professional page numbers to your PDF with custom styling.',
    category: ToolCategory.EDIT,
    icon: 'fa-list-ol',
    path: '/numbering',
    color: '#ec4899'
  }
];

export const BLOG_POSTS = [
  {
    id: 'local-processing-future',
    title: "Why Local PDF Processing is the Future of Security",
    date: "Feb 13, 2026",
    category: "Privacy & Security",
    excerpt: "Discover why cloud-based PDF tools are a risk to your privacy and how local-first software protects your documents.",
    content: `
      <p>In an era where data breaches are front-page news every week, the way we handle our sensitive documents has never been more important. For years, the convenience of "cloud-based" PDF tools has masked a significant security flaw: the moment you click "Upload," you lose control of your data.</p>
      <blockquote>"Privacy isn't about having something to hide; it's about having something to protect."</blockquote>
      <h2>The Hidden Cost of "Free" Cloud Tools</h2>
      <p>Most popular online PDF converters aren't actually selling a service—they're collecting data. When you upload a tax return, a medical record, or a legal contract to a third-party server, that document is stored, indexed, and sometimes even used to train AI models.</p>
      <h2>The Rise of WebAssembly (Wasm)</h2>
      <p>The good news is that technology has caught up. Modern browsers are powerful enough to run complex software locally. Tools like <strong>PDFMitra</strong> leverage this power to bring professional-grade PDF processing directly to your browser's memory.</p>
      <h2>Conclusion</h2>
      <p>By choosing local processing, you aren't just getting faster results—you're ensuring that your private life stays private. Your documents are your business, and they should stay on your machine.</p>
    `
  },
  {
    id: 'compress-without-quality-loss',
    title: "5 Ways to Compress PDFs Without Losing Quality",
    date: "Feb 12, 2026",
    category: "Optimization",
    excerpt: "Learn the technical secrets behind high-efficiency PDF compression and how to keep your visuals crisp.",
    content: `
      <p>We've all been there: you have a beautiful document ready to send, but it's 25MB and the email limit is 10MB. Compression is the obvious answer, but how do you shrink a file without making the images look like pixelated mush?</p>
      <h2>1. Downsample Images Smartly</h2>
      <p>Instead of just reducing quality, downsampling changes the number of pixels. For standard viewing, 144 DPI (dots per inch) is often indistinguishable from 300 DPI on a screen but saves 75% in file size.</p>
      <h2>2. Modernize the Compression Algorithm</h2>
      <p>Using CCITT Group 4 for black and white and Flate for color ensures the best balance between size and detail preservation.</p>
      <h2>3. Remove Redundant Metadata</h2>
      <p>PDFs often store thumbnail previews, editing history, and metadata that adds bulk. Stripping this "dead weight" can save megabytes instantly.</p>
      <h2>Conclusion</h2>
      <p>High-quality compression isn't magic—it's math. Using tools like PDFMitra's Compress PDF allows you to apply these rules locally and safely.</p>
    `
  },
  {
    id: 'word-to-pdf-layout-fidelity',
    title: "Mastering Word to PDF: Layout Fidelity Tips",
    date: "Feb 11, 2026",
    category: "Conversion",
    excerpt: "Ensuring your documents look perfect across all devices starts with the right conversion strategy.",
    content: `
      <p>Converting a Word document to PDF sounds simple, but layout shifts, missing fonts, and broken images can turn a professional resume into a mess. Here's how to ensure pixel-perfect fidelity.</p>
      <h2>Use Standard System Fonts</h2>
      <p>While custom fonts look great, they often aren't embedded correctly. Sticking to classics like Arial, Helvetica, or Times New Roman ensures a clean render on any system.</p>
      <h2>Leverage High-Fidelity Rendering</h2>
      <p>PDFMitra uses a "Virtual Width" rendering technique to simulate an A4 page within your browser, capturing every margin and line break exactly as Word intended.</p>
      <h2>Conclusion</h2>
      <p>Consistency is key. By using local conversion tools that respect CSS and layout scales, you can rest easy knowing your PDF looks exactly like your Word doc.</p>
    `
  },
  {
    id: 'id-card-digital-prep',
    title: "How to Prepare Your ID Card for Digital Verification",
    date: "Feb 10, 2026",
    category: "Productivity",
    excerpt: "Merging ID cards into a single PDF is now a requirement for most banking and government portals.",
    content: `
      <p>Applying for a visa, a bank account, or a new job? You'll likely need to upload a single PDF containing both the front and back of your ID card. Doing this manually in a photo editor is frustrating. Here's the professional way to do it.</p>
      <h2>The Standard Layout</h2>
      <p>Most official portals expect an A4 page with the front side on top and the back side directly below it. This ensures that the reviewer can see all security features without scrolling through multiple files.</p>
      <h2>Why Local Merging Matters</h2>
      <p>Your ID card contains your most sensitive data. <strong>Never</strong> upload a photo of your ID to a cloud-based merger. Use PDFMitra's ID Card Merge tool to handle the process entirely on your device.</p>
      <h2>Conclusion</h2>
      <p>Save time and stay secure. A single, well-formatted PDF makes a professional impression and speeds up your verification process.</p>
    `
  },
  {
    id: 'mobile-scanning-quality',
    title: "Mobile Scanning: How to Get Desktop-Quality Results",
    date: "Feb 9, 2026",
    category: "Tutorials",
    excerpt: "Your smartphone camera is a powerful scanner if you know the right techniques for lighting and alignment.",
    content: `
      <p>Gone are the days of bulky flatbed scanners. With the right software, your smartphone can produce high-contrast, perfectly aligned PDF scans. But hardware is only half the battle.</p>
      <h2>1. The Lighting Rule</h2>
      <p>Avoid direct camera flash. It creates "hot spots" on glossy paper. Instead, place your document near a window or under a diffused desk lamp. Natural light is best for text clarity.</p>
      <h2>2. Angle and Perspective</h2>
      <p>You don't need to be perfectly parallel. Modern tools like <strong>jscanify</strong> (used in PDFMitra) can automatically detect corners and correct the perspective, making the document look as if it was scanned on a flatbed.</p>
      <h2>Conclusion</h2>
      <p>By combining steady hands with local edge-detection algorithms, you can turn your phone into a professional document digitizer.</p>
    `
  },
  {
    id: 'financial-pdf-security',
    title: "Why You Should Never Send Unprotected Financial PDFs",
    date: "Feb 8, 2026",
    category: "Privacy & Security",
    excerpt: "Sending bank statements or tax returns via email? Learn why password protection is your first line of defense.",
    content: `
      <p>Emails are often stored on servers in plain text. If you send a sensitive financial PDF as a standard attachment, anyone with access to the email thread can read your data. It's time to start locking your documents.</p>
      <blockquote>"Data encryption is no longer optional for personal finance."</blockquote>
      <h2>AES-256 Encryption</h2>
      <p>Modern PDFs support strong encryption. By adding a password, you ensure that even if the file is intercepted, the content remains unreadable without the key.</p>
      <h2>Use a Local Protector</h2>
      <p>To secure a file, you shouldn't have to upload it to a third party first. That defeats the purpose. Use a local tool to apply the password before it ever hits the internet.</p>
    `
  },
  {
    id: 'decoding-pdf-errors',
    title: "Decoding PDF Errors: Can a Corrupt File Be Fixed?",
    date: "Feb 7, 2026",
    category: "Optimization",
    excerpt: "Understanding cross-reference table errors and how 'Repair' tools attempt to rebuild your documents.",
    content: `
      <p>A "corrupt PDF" usually means the internal index (the cross-reference table) has been broken. This often happens during an interrupted download or a bad save from an old application.</p>
      <h2>The Re-Indexing Process</h2>
      <p>Repair tools work by scanning the raw bytes of the PDF to find "objects" (text blocks, images, fonts) and building a brand new index from scratch. It's like rewriting the table of contents for a book that has lost its original pages.</p>
      <h2>Limits of Browser Repair</h2>
      <p>While local tools can fix index errors, they cannot recreate data that was never saved. If the binary data is gone, the file is likely lost. Always maintain a backup!</p>
    `
  },
  {
    id: 'paperless-business-2026',
    title: "Going Paperless: The 2026 Small Business Guide",
    date: "Feb 6, 2026",
    category: "Productivity",
    excerpt: "Reduce overhead and increase efficiency by moving your entire office to a digital-first PDF workflow.",
    content: `
      <p>In 2026, the cost of physical storage and printing is higher than ever. Small businesses are increasingly moving to 100% digital workflows to save money and the environment.</p>
      <h2>Digital Watermarking</h2>
      <p>Instead of physical stamps, use digital watermarks to track document versions and add branding. It's faster, cleaner, and searchable.</p>
      <h2>The ROI of PDF Tools</h2>
      <p>By automating tasks like merging invoices or splitting reports, business owners can save dozens of hours every month. Time is money, and digital document management is the best way to reclaim it.</p>
    `
  },
  {
    id: 'understanding-pdf-a',
    title: "Understanding PDF/A: Long-term Archiving Explained",
    date: "Feb 5, 2026",
    category: "Compliance",
    excerpt: "Why your business needs to be using the PDF/A standard for legal and compliance documents.",
    content: `
      <p>Documents today needs to be readable not just tomorrow, but 50 years from now. Traditional PDFs often depend on external fonts or data. PDF/A (PDF for Archiving) is the solution.</p>
      <h2>No External Dependencies</h2>
      <p>PDF/A requires all content (fonts, color profiles, etc.) to be embedded within the file. This ensures that a PDF/A created today will look identical on a computer in 2076.</p>
      <h2>Broad Acceptance</h2>
      <p>Legal systems, governments, and libraries worldwide mandate PDF/A for archiving sensitive records. It's the "gold standard" of digital preservation.</p>
    `
  },
  {
    id: 'organize-large-documents',
    title: "How to Organize Large Documents Effectively",
    date: "Feb 4, 2026",
    category: "Productivity",
    excerpt: "Merge, Split, and Reorder: A guide to managing massive PDF files without breaking your workflow.",
    content: `
      <p>Handling a 500-page PDF isn't just a technical challenge—it's a cognitive one. If you can't find the information you need, the document is useless. Here's how to bring order to the chaos.</p>
      <h2>Phase 1: Splitting and Extraction</h2>
      <p>Don't work on the whole file if you only need Chapter 4. Use <strong>Split PDF</strong> to break large manuals into manageable chunks, or <strong>Extract Pages</strong> to pull out just the critical summaries.</p>
      <h2>Phase 2: Semantic Sequencing</h2>
      <p>Documents often grow organically, meaning the order of pages might not make sense for the final reader. <strong>Reorder Pages</strong> allows you to build a logical narrative flow effortlessly.</p>
    `
  }
];
