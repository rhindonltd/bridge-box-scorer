export function TeaCupIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="h-20 w-20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Steam */}
      <path
        d="M23 16C19 12 25 9 21 5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M33 16C29 12 35 9 31 5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Cup */}
      <path
        d="M13 22H49V38C49 47 42 53 31 53C20 53 13 47 13 38V22Z"
        fill="currentColor"
      />

      {/* Tea */}
      <path
        d="M16 25H46"
        stroke="black"
        strokeOpacity="0.25"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Handle */}
      <path
        d="M49 27H53C59 27 60 34 57 39C55 42 52 43 49 43"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />

      {/* Saucer */}
      <path
        d="M8 53H55"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
