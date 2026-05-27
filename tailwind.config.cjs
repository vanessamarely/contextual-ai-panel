module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accessible friendly palette (sufficient contrast)
        'bg-deep': '#071024',
        'surface': '#0f1724',
        'muted': '#9FB3C8',
        'accent-cyan': '#06b6d4',
        'accent-purple': '#7c3aed'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial']
      }
    }
  },
  plugins: []
}
