import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="text-center max-w-sm">
        <h1 className="text-3xl font-bold text-gray-900">JobTrackr</h1>
        <p className="mt-2 text-gray-600">
          Organiza y trackea tus postulaciones de empleo en un solo lugar.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Crear cuenta
          </Link>
        </div>
      </div>
    </main>
  );
}
