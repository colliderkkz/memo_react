"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 分享页挂载后跳回首页并定位到该 memo（对应原 goto(`/#memo-<id>`, {replace:true, reset:false})） */
export function MemoShareRedirect({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/#memo-${id}`, { scroll: false });
  }, [router, id]);

  return null;
}
