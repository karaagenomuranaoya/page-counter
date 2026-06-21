import "./globals.css";

export const metadata = {
  title: "やったこと記録",
  description: "小さな行動を簡単に記録するアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}