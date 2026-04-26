# Variable { validation } may only use the same var — not other variables. This check
# (Terraform 1.5+) runs at plan/apply and can reference both enable_github_oidc and github_repository.
check "github_repository_when_oidc" {
  assert {
    condition     = !var.enable_github_oidc || var.github_repository != "CHANGE_ME/CHANGE_ME"
    error_message = "When enable_github_oidc is true, set github_repository to a real owner/repo in tfvars or pass -var (the deploy workflow uses your repo from github.repository) — not the CHANGE_ME placeholder."
  }
}
