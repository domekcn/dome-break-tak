// ข้อมูลสินค้าและการตั้งค่าร้าน "โดมเบรคแตก" (DOME BREAK TAK)
const SHOP_CONFIG = {
  shopName: "โดมเบรคแตก",
  shopNameEn: "DOME BREAK TAK",
  tagline: "กล้วยเบรคแตก กรอบอร่อย หอม มันส์ เบรคไม่อยู่!",
  phone: "091-8197286",
  lineId: "@448gijej",
  lineUrl: "https://line.me/R/ti/p/@448gijej",
  promptPay: {
    accountName: "คมชาญ จันทร์นาค",
    qrImage: "assets/images/promptpay_qr.jpg"
  },
  logoImage: "assets/images/main_logo.jpg",
  missionTargetBags: 10,
  initialSimulatedBags: 0, // ค่าเริ่มต้น หากยังโหลดจาก Sheet ไม่สำเร็จ
  googleSheetWebAppUrl: "https://script.google.com/macros/s/AKfycbyLr1JcYOUEvbvE-LHrSD03Ui2cjKVNPUoPd7FG4N0ZnMGemoikcgR7yI8FUIsa6T_r/exec",
  deliveryOptions: {
    office: { id: "office", name: "จัดส่งที่ออฟฟิศ", fee: 0, label: "ส่งฟรี!" },
    other: { id: "other", name: "จัดส่งทางอื่น ๆ", fee: 50, label: "เหมาจ่าย 50 บาท" }
  }
};

// ข้อมูลรสชาติทั้ง 4 รสชาติ (ใช้รูปโลโก้จริงจากทางร้าน)
const FLAVORS = [
  {
    id: "original",
    name: "ออริจินอล",
    nameEn: "Original",
    emoji: "🍌",
    color: "amber",
    tagColor: "bg-amber-500",
    badgeBg: "bg-amber-100 text-amber-900 border-amber-300",
    desc: "รสกล้วยแท้ธรรมชาติ กรอบ หอม หวานกลมกล่อมจากกล้วยน้ำว้าคัดพิเศษ ไม่ใส่น้ำตาลเพิ่ม",
    stickerImage: "assets/images/flavor_original.jpg",
    accentColor: "#F59E0B"
  },
  {
    id: "sweet",
    name: "หวาน",
    nameEn: "Sweet Glazed",
    emoji: "🍯",
    color: "orange",
    tagColor: "bg-orange-500",
    badgeBg: "bg-orange-100 text-orange-900 border-orange-300",
    desc: "เคลือบน้ำตาลคาราเมลบางเฉียบ หวานละมุนกำลังดี เคี้ยวเพลิน ทานคู่กับชา กาแฟ เข้ากันสุดๆ",
    stickerImage: "assets/images/flavor_sweet.jpg",
    accentColor: "#D97706"
  },
  {
    id: "salty",
    name: "เค็ม",
    nameEn: "Sea Salt",
    emoji: "🧂",
    color: "sky",
    tagColor: "bg-sky-500",
    badgeBg: "bg-sky-100 text-sky-900 border-sky-300",
    desc: "คลุกเคล้าเกลือทะเลธรรมชาติรสกลมกล่อม เค็มนิดๆ ตัดรสหวานกล้วย กรุบกรอบ หยุดไม่อยู่",
    stickerImage: "assets/images/flavor_salty.jpg",
    accentColor: "#0284C7"
  },
  {
    id: "paprika",
    name: "ปาปริก้า",
    nameEn: "Spicy Paprika",
    emoji: "🌶️",
    color: "rose",
    tagColor: "bg-rose-500",
    badgeBg: "bg-rose-100 text-rose-900 border-rose-300",
    desc: "รสเด็ดสูตรพิเศษ คลุกผงปาปริก้ารมควันและเครื่องเทศรสจัดจ้าน เข้มข้น แซ่บจี๊ดถึงใจ",
    stickerImage: "assets/images/flavor_paprika.jpg",
    accentColor: "#E11D48"
  }
];

// ข้อมูลสินค้า 2 ขนาด: ถุงเล็ก และ ถุงใหญ่
const PRODUCTS = [
  {
    id: "small-bag",
    name: "กล้วยเบรคแตก (ถุงเล็ก)",
    sizeLabel: "ถุงเล็ก",
    weight: "~150 กรัม",
    packageType: "ถุงคราฟท์ซิปล็อค ไซส์พกพา",
    basePrice: 45,
    prices: {
      original: 45,
      sweet: 45,
      salty: 45,
      paprika: 50
    },
    image: "assets/images/product_small.jpg",
    tags: ["🔥 ขายดีประจำสัปดาห์", "⚡ ไซส์พกพา", "💯 ทอดสดใหม่"],
    soldCount: "1,420+",
    rating: 4.9,
    reviews: 218,
    description: "ขนาดกำลังพอดี พกพาสะดวก กรอบบาง ไม่อมน้ำมัน ทานเพลินทุกที่ทุกเวลา ซีลปากถุงอย่างดี คงความกรอบนาน"
  },
  {
    id: "large-bag",
    name: "กล้วยเบรคแตก (ถุงใหญ่)",
    sizeLabel: "ถุงใหญ่ จุใจ",
    weight: "~500 กรัม",
    packageType: "ถุงคราฟท์ซิปล็อค Family Size",
    basePrice: 130,
    prices: {
      original: 130,
      sweet: 130,
      salty: 130,
      paprika: 150
    },
    image: "assets/images/product_large.jpg",
    tags: ["⭐ สุดคุ้ม Family Size", "🎉 ยอดนิยมสำหรับปาร์ตี้", "🎁 เหมาะเป็นของฝาก"],
    soldCount: "980+",
    rating: 5.0,
    reviews: 164,
    description: "ขนาดใหญ่จุใจ เหมาะสำหรับแบ่งปันในครอบครัว ที่ทำงาน หรือสายทานจุ ทานได้จุใจ คุ้มค่าที่สุด ถุงซิปล็อคเก็บได้นาน"
  }
];

if (typeof window !== 'undefined') {
  window.SHOP_CONFIG = SHOP_CONFIG;
  window.FLAVORS = FLAVORS;
  window.PRODUCTS = PRODUCTS;
}
