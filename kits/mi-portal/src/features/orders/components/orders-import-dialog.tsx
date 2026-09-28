import { useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { toast } from 'sonner'
import { readTableFile } from '@/lib/mi/excel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type Order, fromImportRow, orderImportSchema } from '../data/schema'
import { useOrdersStore } from '../data/store'

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

type Parsed = { file: string; ok: Order[]; bad: { line: number; msg: string }[] }

// 엑셀 날짜 칸은 Date 로 오므로 YYYY-MM-DD 로 맞춥니다.
const asYmd = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : v)

export function OrdersImportDialog({ open, onOpenChange }: Props) {
  const [parsed, setParsed] = useState<Parsed | null>(null)
  const [busy, setBusy] = useState(false)
  const { replaceAll, append } = useOrdersStore()

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    try {
      const t = await readTableFile(file)
      const ok: Order[] = []
      const bad: Parsed['bad'] = []
      t.rows.forEach((raw: Record<string, unknown>, i: number) => {
        const r = orderImportSchema.safeParse({ ...raw, 수주일: asYmd(raw['수주일']), 납기: asYmd(raw['납기']) })
        if (r.success) ok.push(fromImportRow(r.data))
        else bad.push({ line: i + 2, msg: r.error.issues.map((x) => x.message).join(', ') })
      })
      setParsed({ file: file.name, ok, bad })
    } catch (e) {
      toast.error('파일을 읽지 못했습니다: ' + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    setParsed(null)
    onOpenChange(false)
  }

  const apply = (mode: 'replace' | 'append') => {
    if (!parsed?.ok.length) return
    if (mode === 'replace') replaceAll(parsed.ok)
    else append(parsed.ok)
    toast.success(`${parsed.ok.length}건을 ${mode === 'replace' ? '목록으로 바꿨습니다' : '목록에 더했습니다'}.`)
    close()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className='gap-4 sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>엑셀에서 수주 가져오기</DialogTitle>
          <DialogDescription>
            xlsx 또는 csv 파일. 첫 행 머리글은 수주번호, 수주일, OEM, 품목, 수량, 단가, 상태, 납기 입니다.
            "엑셀 내려받기" 로 받은 파일 형식 그대로입니다.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-2'>
          <Label htmlFor='orders-file'>파일</Label>
          <Input
            id='orders-file'
            type='file'
            accept='.xlsx,.csv'
            disabled={busy}
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
        {parsed && (
          <div className='space-y-2 rounded-md border p-3 text-sm'>
            <div className='flex items-center gap-2 font-medium'>
              <FileSpreadsheet className='size-4 text-muted-foreground' />
              {parsed.file}
            </div>
            <p>
              가져올 수 있는 행 <strong className='tabular-nums'>{parsed.ok.length}</strong>건
              {parsed.bad.length > 0 && (
                <>
                  , 제외할 행 <strong className='tabular-nums text-destructive'>{parsed.bad.length}</strong>건
                </>
              )}
            </p>
            {parsed.bad.length > 0 && (
              <ul className='max-h-32 list-disc space-y-0.5 overflow-y-auto ps-5 text-destructive'>
                {parsed.bad.slice(0, 20).map((b) => (
                  <li key={b.line}>
                    {b.line}행: {b.msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogFooter className='gap-2'>
          <DialogClose asChild>
            <Button variant='outline'>닫기</Button>
          </DialogClose>
          <Button variant='outline' disabled={!parsed?.ok.length} onClick={() => apply('append')}>
            기존 목록에 더하기
          </Button>
          <Button disabled={!parsed?.ok.length} onClick={() => apply('replace')}>
            이 파일로 바꾸기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
