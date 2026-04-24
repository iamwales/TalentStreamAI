import { SignInView } from "./sign-in-view";

export function generateStaticParams() {
    return [{ "sign-in": [] as string[] }];
}

export default function SignInPage() {
    return <SignInView />;
}
