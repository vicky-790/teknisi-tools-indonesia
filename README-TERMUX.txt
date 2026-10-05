TEKNISI TOOLS V1.3.1 — MOBILE RESPONSIVE FIX

FIX:
- Dashboard tidak lagi dipaksa width 720px di HP
- Tidak ada sisi kiri/kanan yang terpotong
- Sidebar desktop berubah menjadi tab horizontal di HP
- Tab dashboard dapat digeser kiri/kanan
- KPI cards dapat di-swipe horizontal
- Quick Tools dapat di-swipe horizontal
- Chart mengikuti lebar layar
- Recent Activity turun ke bawah pada mobile
- Desktop layout tetap menggunakan sidebar

TEST:
cd /sdcard/Download
unzip Teknisi-Tools-Indonesia-V1.3.1-Mobile-Fix.zip
cd teknisi-tools-v1.3.1-mobile-fix
python -m http.server 8080

Buka:
http://localhost:8080

PENTING:
Jika tampilan lama masih muncul, hapus site data/cache localhost:8080 sekali,
karena V1.3 memakai Service Worker.
