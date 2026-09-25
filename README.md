# ETK Kablo • TDS Studio Pro v3.0

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://www.etkkablo.com)
[![Platform](https://img.shields.io/badge/platform-Windows%20Desktop%20%28Electron%29-emerald.svg)]()
[![Stack](https://img.shields.io/badge/stack-Electron%20%2B%20React%20%2B%20FastAPI-purple.svg)]()

**ETK Kablo TDS Studio Pro v3.0**, ETK Kablo bünyesindeki 460 ürün ve 10.000'den fazla kablo varyasyonu için resmi teknik bilgi föyü (**TDS - Technical Data Sheet**) üreten, düzenleyen ve piksel piksele kusursuz A4 vektörel PDF çıktısı sağlayan bağımsız bir **Windows Masaüstü Mühendislik Stüdyosu** yazılımıdır.

---

## 🖥️ Hızlı Başlangıç (Masaüstü Uygulaması)

Ana dizindeki **`start_desktop.bat`** dosyasına çift tıklayın:
* Eksik derleme varsa `dist` paketini otomatik oluşturur.
* Arka planda FastAPI backend servisini sessizce ayağa kaldırır.
* Yerel Electron masaüstü penceresini tam ekran olarak açar.
* Uygulamadan çıkıldığında tüm arka plan süreçlerini otomatik olarak temizler.

---

## 🛠️ Manuel Kurulum ve CLI Komutları

### Gereksinimler
* **Node.js** v18+ ve **npm**
* **Python** 3.10+
* **Playwright** Chromium sürücüsü (`playwright install chromium`)

### 1. Backend Bağımlılıkları:
```bash
cd backend
pip install -r requirements.txt
playwright install chromium
```

### 2. Masaüstü Uygulaması Başlatma & Paketleme:
```bash
cd frontend
npm install

# Masaüstü (Electron) Uygulamasını Çalıştırma:
npm start

# Bağımsız Windows (.exe) Kurulum Paketi Üretimi:
npm run dist
```

---

## 🏗️ Sistem Mimarisi & Teknoloji Yığını

| Katman | Teknoloji | Görev / Açıklama |
| :--- | :--- | :--- |
| **Masaüstü Kabuğu** | **Electron v44** | Yerel Windows masaüstü entegrasyonu, tek instance koruması ve FastAPI süreç orkestrasyonu. |
| **Ön Yüz (Frontend)** | **React 19, TypeScript, Vite 8, Tailwind CSS v4** | Modern reaktif stüdyo paneli, tablo tasarımcısı ve A4 canlı önizleme motoru. |
| **Arka Plan Servisi** | **FastAPI (Python), Pydantic v2, Uvicorn** | Yüksek performanslı in-memory katalog endeksleme, varyasyon araması ve analitik hesaplamalar. |
| **PDF Baskı Motoru** | **Playwright (Chromium)** | Canlı önizleme DOM'unu doğrudan piksel piksele 1:1 vektörel A4 PDF'e dönüştüren yüksek çözünürlüklü motor. |
| **Varlık Yönetimi** | **Gömülü Base64 Mimarisi** | Çevrimdışı (offline) modda sıfır kırılma garantisiyle gömülü vektörel logo ve 3D kablo renderları. |

---

## ✨ Temel Yetenekler ve Modüller

### 1. 1:1 Canlı Önizleme ile Birebir Eşleşen Vektörel PDF
* Canlı önizleme ekranında görünen tüm tablolar, tipografi, renkler ve logolar A4 baskı standardına (`@page { size: 210mm 297mm; margin: 0; }`) göre serileştirilerek Playwright üzerinden PDF'e dönüştürülür.
* Vektörel netlik için `device_scale_factor=2` uygulanmıştır.
* Dış masaüstü arayüzüne ait gölgeler, kenarlıklar veya boşluklar PDF'e sızmaz.

### 2. Modüler Puzzle Bölüm Sistemi (`PuzzleSectionConfig`)
* Kullanım Alanları, Kablo Yapısı, Standartlar, Elektriksel Özellikler, Mekanik Testler ve Varyasyonlar bağımsız modüller halindedir.
* İstenilen bölüm tek tıkla açılıp kapatılabilir veya sırası değiştirilebilir.

### 3. Gelişmiş Dinamik Tablo Tasarımcısı (`TableDesigner`)
* Sektörel kablo testleri için çatı başlıklar (**Super Headers**), sütun hizalamaları ve matris görünümleri.
* Özel zebra renklendirme (`tint` ve `primary` aile renkleriyle uyumlu).
* Şablon içe/dışa aktarma (JSON) ve hızlı tablo ekleme sihirbazı.

### 4. Fiziksel Kablo Hesaplayıcı (`CableCalculatorService`)
* İletken kesiti, damar/per sayısı, zırh ve kılıf parametrelerine göre analitik dış çap ve toplam ağırlık tahmini.

---

## 📁 Proje Dosya Yapısı

```
etkkablo/
├── backend/                       # FastAPI Mikroservis Katmanı
│   ├── app/
│   │   ├── api/v1/                # REST ve PDF API Uç Noktaları
│   │   ├── models/                # Pydantic v2 Veri ve Şema Modelleri
│   │   ├── services/              # In-Memory Katalog, PDF ve Hesaplayıcı Servisleri
│   │   └── main.py                # FastAPI Uygulama Giriş Noktası
│   ├── catalogs/                  # 15 Kablo Ailesinin Ham JSON Segmentleri
│   ├── etk_master_catalog.json    # 13.8 MB RAM'e Yüklenen Ana Katalog
│   └── requirements.txt           # Python Bağımlılıkları
│
├── backend_assets/                # Sunucu Tarafı Görsel & Font Kaynakları
│   ├── fonts/                     # Kurumsal Tipografi Dosyaları
│   └── *.jpeg, *.png              # Kablo 3D ve Kesit Görselleri
│
├── frontend/                      # React & Electron İstemci Katmanı
│   ├── electron/                  # Electron Masaüstü Ana Süreç Dosyaları (main.cjs, preload.cjs)
│   ├── public/                    # Statik Varlıklar
│   ├── src/
│   │   ├── components/            # UI Bileşenleri (Önizleme, Tasarımcı, Hesaplayıcı, Menüler)
│   │   ├── services/              # API İstemcisi & Base64 Varlık Modülleri
│   │   ├── types/                 # TypeScript Veri Tipleri
│   │   ├── utils/                 # Kurumsal Renk ve Yardımcı Fonksiyonlar
│   │   ├── App.tsx                # Ana Stüdyo Bileşeni
│   │   └── main.tsx               # React Giriş Noktası
│   ├── package.json               # Node.js Bağımlılıkları ve Masaüstü Yapılandırması
│   └── vite.config.ts             # Vite Derleyici Yapılandırması
│
├── etk-logo.svg                   # Vektörel Kurumsal ETK Kablo Logosu
├── start_desktop.bat              # Tek Tıkla Masaüstü Uygulama Başlatıcı
└── README.md                      # Proje Dökümantasyonu
```

---

## 🔒 Lisans ve Telif Hakkı
Bu yazılım **ETK Kablo** kurumsal teknik dökümantasyon ve üretim standartları için özel olarak geliştirilmiştir. Tüm hakları saklıdır.
