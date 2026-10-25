// Checks the account emails' templates before the deploy sends them to Supabase (Account safety settings): each
// must parse and render for every kind of new account (free guide or not, Hebrew, English, or nothing known), the
// way Supabase renders them (Go templates; .ConfirmationURL and .Data = the account's metadata). A template error
// would stop every sign-up email, so the deploy stops instead.
//
//	go run tools/check_email_template.go supabase/templates/confirmation.html supabase/templates/confirmation_subject.txt
package main

import (
	"bytes"
	htmltemplate "html/template"
	"fmt"
	"os"
	"strings"
	texttemplate "text/template"
)

func main() {
	accounts := []map[string]interface{}{
		{"gift": "1", "lang": "he", "name": "x"},
		{"gift": "1", "lang": "en"},
		{"lang": "he"},
		{"lang": "en"},
		{},
	}
	failed := false
	for _, path := range os.Args[1:] {
		src, err := os.ReadFile(path)
		if err != nil {
			fmt.Println("::error::", err)
			os.Exit(1)
		}
		for _, data := range accounts {
			vars := map[string]interface{}{"ConfirmationURL": "https://example.com/verify?token=t", "Data": data,
				"Email": "a@example.com", "SiteURL": "https://shop.mw.photography", "RedirectTo": "https://shop.mw.photography/account/"}
			var out bytes.Buffer
			if strings.HasSuffix(path, ".html") {
				t, err := htmltemplate.New("t").Parse(string(src))
				if err == nil {
					err = t.Execute(&out, vars)
				}
				if err == nil && !strings.Contains(out.String(), "https://example.com/verify") {
					err = fmt.Errorf("the button doesn't carry the emailed link")
				}
				if err != nil {
					fmt.Printf("::error title=%s::%v (account %v)\n", path, err, data)
					failed = true
				}
			} else {
				t, err := texttemplate.New("t").Parse(string(src))
				if err == nil {
					err = t.Execute(&out, vars)
				}
				if err != nil || strings.TrimSpace(out.String()) == "" {
					fmt.Printf("::error title=%s::%v (account %v)\n", path, err, data)
					failed = true
				}
			}
			if !failed {
				fmt.Printf("%s %v: ok (%d characters)\n", path, data, out.Len())
			}
		}
	}
	if failed {
		os.Exit(1)
	}
}
