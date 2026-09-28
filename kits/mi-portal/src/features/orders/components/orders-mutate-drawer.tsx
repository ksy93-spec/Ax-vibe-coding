import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { SelectDropdown } from '@/components/select-dropdown'
import { oems, statuses } from '../data/data'
import { type Order, orderSchema } from '../data/schema'
import { useOrdersStore } from '../data/store'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow?: Order
}

const today = () => new Date().toISOString().slice(0, 10)

export function OrdersMutateDrawer({ open, onOpenChange, currentRow }: Props) {
  const isUpdate = !!currentRow
  const { add, update, nextId, orders } = useOrdersStore()

  const blank = (): Order => ({
    id: nextId(),
    date: today(),
    oem: '',
    part: '',
    qty: 100,
    unitPrice: 0,
    status: '협의',
    due: today(),
  })

  const form = useForm<Order>({
    resolver: zodResolver(orderSchema),
    defaultValues: currentRow ?? blank(),
  })

  // 서랍이 열릴 때마다 폼을 채웁니다. 새 수주면 다음 수주번호를 미리 넣습니다.
  useEffect(() => {
    if (open) form.reset(currentRow ?? blank())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentRow])

  const onSubmit = (data: Order) => {
    if (isUpdate) {
      update(currentRow.id, data)
      toast.success(`${data.id} 를 수정했습니다.`)
    } else {
      if (orders.some((o) => o.id === data.id)) {
        form.setError('id', { message: '이미 있는 수주번호입니다' })
        return
      }
      add(data)
      toast.success(`${data.id} 를 추가했습니다.`)
    }
    onOpenChange(false)
  }

  const numberField = (name: 'qty' | 'unitPrice', label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type='number'
              inputMode='numeric'
              value={Number.isNaN(field.value) ? '' : field.value}
              onChange={(e) => field.onChange(e.target.valueAsNumber)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  const dateField = (name: 'date' | 'due', label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type='date' {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
    >
      <SheetContent className='flex flex-col'>
        <SheetHeader className='text-start'>
          <SheetTitle>{isUpdate ? '수주 수정' : '새 수주'}</SheetTitle>
          <SheetDescription>필요한 항목을 채우고 저장을 누르세요.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form id='orders-form' onSubmit={form.handleSubmit(onSubmit)} className='flex-1 space-y-5 overflow-y-auto px-4'>
            <FormField
              control={form.control}
              name='id'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>수주번호</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isUpdate} placeholder='SO-2026-001' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-3'>
              {dateField('date', '수주일')}
              {dateField('due', '납기')}
            </div>
            <FormField
              control={form.control}
              name='oem'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>OEM</FormLabel>
                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    placeholder='OEM 선택'
                    items={oems}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='part'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>품목</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='예: 조향 센서' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-3'>
              {numberField('qty', '수량')}
              {numberField('unitPrice', '단가(원)')}
            </div>
            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상태</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className='flex gap-4'>
                      {statuses.map((s) => (
                        <FormItem key={s.value} className='flex items-center gap-2'>
                          <FormControl>
                            <RadioGroupItem value={s.value} />
                          </FormControl>
                          <FormLabel className='font-normal'>{s.label}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <SheetFooter className='gap-2'>
          <SheetClose asChild>
            <Button variant='outline'>닫기</Button>
          </SheetClose>
          <Button form='orders-form' type='submit'>
            저장
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
