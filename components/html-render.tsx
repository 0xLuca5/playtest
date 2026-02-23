import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

interface HtmlRendererProps {
  src: string; // HTML 文件路径，如 '/sample.html'
}

export function HtmlRenderer({ src }: HtmlRendererProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then((text) => setContent(text));
  }, [src]);

  return (
    <Card className="p-4">
    <div className="prose dark:prose-invert max-w-none">
    <iframe
  src={src} // 你的 HTML 文件路径
  width="100%"           // 宽度自适应父容器
  height="600"           // 高度可自定义
  style={{ border: "none" }} // 可选：去掉边框
  title="Report Preview" // 可选：无障碍友好
/>
    </div>
  </Card>
  );
}