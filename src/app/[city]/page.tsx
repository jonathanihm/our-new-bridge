import { redirect } from 'next/navigation'

type CityParams = { city?: string }

export default async function Page({ params }: { params: Promise<CityParams> }) {
  const { city } = await params
  if (!city) redirect('/des-moines/food')
  redirect(`/${city}/food`)
}
