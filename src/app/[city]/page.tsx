import { redirect } from 'next/navigation'

export default async function Page({ params }: { params: any }) {
  const { city } = await params
  if (!city) redirect('/des-moines/food')
  redirect(`/${city}/food`)
}
