import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, DoorOpen, ListChecks, MoonStar, ReceiptText } from "lucide-react";

const PILLARS = [
  {
    icon: ReceiptText,
    title: "Transparansi Split Bill",
    desc: "Foto struk, split rata otomatis, matriks siapa utang siapa, dan share ke WhatsApp 1 klik.",
  },
  {
    icon: ListChecks,
    title: "Rotasi Piket Otomatis",
    desc: "Tandai selesai → giliran pindah sendiri. Tidak ada lagi drama 'kemarin siapa?'.",
  },
  {
    icon: DoorOpen,
    title: "Buku Tamu Anti-Canggung",
    desc: "Lapor tamu & overnight stay sebelum datang. Semua penghuni dapat notifikasi.",
  },
  {
    icon: MoonStar,
    title: "Jam Tenang",
    desc: "Banner Do Not Disturb otomatis saat quiet hours. Hormati waktu istirahat bareng.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-3xl">
      <header className="flex items-center justify-between p-4">
        <p className="text-lg font-bold">🏠 KosHubOS</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Masuk</Link>
        </Button>
      </header>

      <main className="flex-1 space-y-8 p-4 pb-12">
        <section className="space-y-4 pt-6 text-center">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Kelola kos bareng,
            <br />
            tanpa drama.
          </h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground md:text-base">
            Iuran, piket, tamu, dan jam tenang — satu aplikasi untuk satu rumah. Gratis,
            mobile-first, siap dalam 1 menit.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild size="lg">
              <Link href="/login">
                Mulai Gratis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#fitur">Lihat Fitur</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Buat kos → share kode 6 karakter → teman gabung. Selesai.</p>
        </section>

        <section id="fitur" className="grid gap-3 md:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="space-y-2 p-4">
                <span className="inline-flex rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-2xl bg-muted/60 p-4 text-sm">
          <h2 className="mb-2 font-semibold">Cara pakai (3 langkah)</h2>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Buat kos atau gabung pakai kode invite.</li>
            <li>Catat pengeluaran + foto struk, biar split otomatis.</li>
            <li>Tagih via WhatsApp, tandai lunas 1 klik.</li>
          </ol>
        </section>

        <div className="text-center">
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href="/login">
              Buat Kos Saya Sekarang <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>

      <footer className="border-t p-4 text-center text-xs text-muted-foreground">
        KosHubOS • Built on Next.js + Supabase
      </footer>
    </div>
  );
}
