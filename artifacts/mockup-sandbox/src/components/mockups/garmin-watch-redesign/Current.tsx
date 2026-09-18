export function Current() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#eceae6] p-7">
      <figure className="w-full max-w-[430px]">
        <img
          src="/__mockup/images/garmin-current.png"
          alt="Aktueller Garmin-Simulatorstand"
          className="block h-auto w-full"
        />
        <figcaption className="mt-4 text-center font-['Albert_Sans'] text-sm font-semibold text-[#181A1E]">
          Aktueller Stand – Referenz
        </figcaption>
      </figure>
    </main>
  );
}