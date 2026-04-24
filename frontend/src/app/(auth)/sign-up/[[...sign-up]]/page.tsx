import { SignUpView } from "./sign-up-view";

export function generateStaticParams() {
  return [{ "sign-up": [] as string[] }];
}

export default function SignUpPage() {
  return <SignUpView />;
}
