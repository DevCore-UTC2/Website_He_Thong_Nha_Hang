/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./client/**/*.{html,js}",
    "./client/src/**/*.{html,js}",
  ],
  theme: {
    extend: {
      // 1. Dinh nghia cac Breakpoint chuan tu Mobile den man hinh cuc lon
      screens: {
        'xs': '375px',     // Smartphone co trung (iPhone, Samsung Galaxy)
        'sm': '640px',     // Smartphone lon / May tinh bang doc
        'md': '768px',     // May tinh bang tieu chuan
        'lg': '1024px',    // Laptop nho / May tinh bang man hinh lon
        'xl': '1280px',    // Laptop/Desktop tieu chuan
        '2xl': '1536px',   // Man hinh Desktop lon
        '3xl': '1920px',   // Man hinh Full HD lon / 2K
        '4xl': '2560px',   // Man hinh 4K sieu rong
        
        // 2. Breakpoint dac biet khoa rieng cho che do XOAY NGANG cua Mobile
        'mobile-landscape': { 
          'raw': '(max-width: 932px) and (orientation: landscape)' 
        },
      },
      // 3. Toi uu hoa chieu cao dong de tranh loi thanh dia chi trinh duyet tren Mobile (100vh bug)
      height: {
        'screen-dynamic': '100dvh',
      },
      minHeight: {
        'screen-dynamic': '100dvh',
      }
    },
  },
  plugins: [],
};
