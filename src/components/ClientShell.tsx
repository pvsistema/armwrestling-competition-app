// Server-rendered placeholder for client-only routes (ssr: false): visually hidden text for crawlers.
export default function ClientShell() {
  return (
    <div className="sr-only">
      <h1>Рукоборец — программа для турниров по армрестлингу</h1>
      <p>Регистрация и взвешивание, жеребьёвка, сетка до двух поражений, пульт судьи, протоколы и табло для зала.</p>
    </div>
  );
}
