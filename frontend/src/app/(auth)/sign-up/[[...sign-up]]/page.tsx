import { SignUpView } from "./sign-up-view";

export function generateStaticParams() {
  return [{ "sign-up": [] as string[] }];
}

export function generateStaticParams() {
  return [];
}

export default function SignUpPage() {
  return <SignUpView />;
}
