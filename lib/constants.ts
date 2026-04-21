export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export const LANGUAGE_OPTIONS = [
  {
    value: "javascript",
    label: "JavaScript",
    monaco: "javascript",
    icon: "JS",
    logo: "https://cdn.simpleicons.org/javascript/F7DF1E",
    runnable: true
  },
  {
    value: "python",
    label: "Python",
    monaco: "python",
    icon: "PY",
    logo: "https://cdn.simpleicons.org/python/3776AB",
    runnable: true
  },
  {
    value: "cpp",
    label: "C++",
    monaco: "cpp",
    icon: "C++",
    logo: "https://cdn.simpleicons.org/cplusplus/00599C",
    runnable: true
  },
  {
    value: "nodejs",
    label: "Node.js",
    monaco: "javascript",
    icon: "N",
    logo: "https://cdn.simpleicons.org/nodedotjs/5FA04E",
    runnable: true
  },
  {
    value: "html",
    label: "HTML",
    monaco: "html",
    icon: "H",
    logo: "https://cdn.simpleicons.org/html5/E34F26",
    runnable: true
  },
  {
    value: "css",
    label: "CSS",
    monaco: "css",
    icon: "C",
    logo: "https://cdn.simpleicons.org/css/1572B6",
    runnable: true
  },
  {
    value: "reactjs",
    label: "React.js",
    monaco: "javascript",
    icon: "R",
    logo: "https://cdn.simpleicons.org/react/61DAFB",
    runnable: true
  },
  {
    value: "nextjs",
    label: "Next.js",
    monaco: "javascript",
    icon: "NX",
    logo: "https://cdn.simpleicons.org/nextdotjs/FFFFFF",
    runnable: true
  }
] as const;

export const DEFAULT_CODE: Record<string, string> = {
  javascript: 'console.log("Hello, CodeShare!");',
  python: 'print("Hello, CodeShare!")',
  cpp: `#include <iostream>
using namespace std;

int main() {
  cout << "Hello, CodeShare!" << endl;
  return 0;
}`,
  nodejs: 'console.log("Hello from Node.js");',
  html: `<!doctype html>
<html>
  <head>
    <title>CodeShare HTML</title>
  </head>
  <body>
    <h1>Hello from HTML</h1>
  </body>
</html>`,
  css: `body {
  margin: 0;
  font-family: Inter, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
}`,
  reactjs: `export default function App() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Hello from React.js</h1>
    </main>
  );
}`,
  nextjs: `export default function Page() {
  return (
    <section style={{ padding: 24 }}>
      <h1>Hello from Next.js</h1>
    </section>
  );
}`
};
