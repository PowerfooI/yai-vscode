import * as assert from 'assert';

import {
	parseGoFileImports,
	parseGoModRequirements,
	findImportPos,
	ImportPosType,
	parseGoModInfo,
} from '../../languages/golang/parse'

const goModContentSimple =
	`module backend

go 1.15

require (
	github.com/gin-contrib/cors v1.3.1
	github.com/gin-gonic/gin v1.6.3
	github.com/sirupsen/logrus v1.7.0
)
`

const goModContentComplex =
	`module github.com/some-repo/k8s-operator

go 1.20

require (
	github.com/go-logr/logr v1.2.4
	github.com/go-sql-driver/mysql v1.7.1
	github.com/google/uuid v1.3.0
	github.com/hashicorp/golang-lru/v2 v2.0.7
	github.com/jmoiron/sqlx v1.3.5
	github.com/onsi/ginkgo/v2 v2.11.0
	github.com/onsi/gomega v1.27.10
	github.com/pkg/errors v0.9.1
	github.com/robfig/cron/v3 v3.0.1
	go.uber.org/zap v1.24.0
	k8s.io/api v0.27.2
	k8s.io/apimachinery v0.27.2
	k8s.io/client-go v0.27.2
	k8s.io/kubernetes v1.27.2
	sigs.k8s.io/controller-runtime v0.15.0
)

require (
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/cespare/xxhash/v2 v2.2.0 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/emicklei/go-restful/v3 v3.9.0 // indirect
	github.com/evanphx/json-patch/v5 v5.6.0 // indirect
	github.com/fsnotify/fsnotify v1.6.0 // indirect
	github.com/go-logr/zapr v1.2.4 // indirect
	github.com/go-openapi/jsonpointer v0.19.6 // indirect
	github.com/go-openapi/jsonreference v0.20.1 // indirect
	github.com/go-openapi/swag v0.22.3 // indirect
	github.com/go-task/slim-sprig v0.0.0-20230315185526-52ccab3ef572 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/golang/protobuf v1.5.3 // indirect
	github.com/google/gnostic v0.5.7-v3refs // indirect
	github.com/google/go-cmp v0.5.9 // indirect
	github.com/google/gofuzz v1.1.0 // indirect
	github.com/google/pprof v0.0.0-20210720184732-4bb14d4b1be1 // indirect
	github.com/imdario/mergo v0.3.6 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/matttproud/golang_protobuf_extensions v1.0.4 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/prometheus/client_golang v1.15.1 // indirect
	github.com/prometheus/client_model v0.4.0 // indirect
	github.com/prometheus/common v0.42.0 // indirect
	github.com/prometheus/procfs v0.9.0 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	go.uber.org/atomic v1.7.0 // indirect
	go.uber.org/multierr v1.6.0 // indirect
	golang.org/x/net v0.12.0 // indirect
	golang.org/x/oauth2 v0.5.0 // indirect
	golang.org/x/sys v0.10.0 // indirect
	golang.org/x/term v0.10.0 // indirect
	golang.org/x/text v0.11.0 // indirect
	golang.org/x/time v0.3.0 // indirect
	golang.org/x/tools v0.9.3 // indirect
	gomodules.xyz/jsonpatch/v2 v2.3.0 // indirect
	google.golang.org/appengine v1.6.7 // indirect
	google.golang.org/protobuf v1.30.0 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/yaml.v2 v2.4.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
	k8s.io/apiextensions-apiserver v0.27.2 // indirect
	k8s.io/component-base v0.27.2 // indirect
	k8s.io/klog/v2 v2.90.1 // indirect
	k8s.io/kube-openapi v0.0.0-20230501164219-8b0f38b5fd1f // indirect
	k8s.io/utils v0.0.0-20230209194617-a36077c30491 // indirect
	sigs.k8s.io/json v0.0.0-20221116044647-bc3834ca7abd // indirect
	sigs.k8s.io/structured-merge-diff/v4 v4.2.3 // indirect
	sigs.k8s.io/yaml v1.3.0 // indirect
)

`

const goFileContentNoImport =
	`
// Some comments here
// Some more comments here
package main

func main() {
	fmt.Println("Hello, world!")
}
`

const goFileContentSingleImport =
	`
// Some comments here
// Some more comments here
package main

import "fmt"
`

const goFileContentMultiImport =
	`package main

import (
	"fmt"
	o "os"
	"strings"
)

func main() {
	fmt.Println("Hello, world!")
}
`

const goFileContentMoreComplex = `/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

import (
	"context"
	"flag"
	"os"

	// Import all Kubernetes client auth plugins (e.g. Azure, GCP, OIDC, etc.)
	// to ensure that exec-entrypoint and run can make use of them.

	"go.uber.org/zap/zapcore"
	_ "k8s.io/client-go/plugin/pkg/client/auth"

	"k8s.io/apimachinery/pkg/runtime"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	clientgoscheme "k8s.io/client-go/kubernetes/scheme"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/healthz"
	"sigs.k8s.io/controller-runtime/pkg/log/zap"

	v1alpha1 "github.com/oceanbase/ob-operator/api/v1alpha1"
	"github.com/oceanbase/ob-operator/internal/controller"
	"github.com/oceanbase/ob-operator/internal/controller/config"
	"github.com/oceanbase/ob-operator/internal/telemetry"
	//+kubebuilder:scaffold:imports
)

var (
	scheme   = runtime.NewScheme()
	setupLog = ctrl.Log.WithName("setup")
)`

describe('Golang Test Suite', () => {
	it('Test parsing a simple go.mod', () => {
		const parsed = parseGoModRequirements(goModContentSimple)
		assert.strictEqual(parsed.length, 3)
		assert.strictEqual(parsed[0].name, 'github.com/gin-contrib/cors')
		assert.strictEqual(parsed[0].version, 'v1.3.1')
		assert.strictEqual(parsed[1].name, 'github.com/gin-gonic/gin')
		assert.strictEqual(parsed[1].version, 'v1.6.3')
		assert.strictEqual(parsed[2].name, 'github.com/sirupsen/logrus')
		assert.strictEqual(parsed[2].version, 'v1.7.0')
	})

	it('Test parsing a complex go file', () => {
		const parsed = parseGoModRequirements(goModContentComplex)
		assert.strictEqual(parsed.length, 69)
		// Start of the list
		assert.strictEqual(parsed[0].name, 'github.com/go-logr/logr')
		assert.strictEqual(parsed[0].version, 'v1.2.4')
		// Middle of the list
		assert.strictEqual(parsed[34].name, 'github.com/josharian/intern')
		assert.strictEqual(parsed[34].version, 'v1.0.0')
		// End of the list
		assert.strictEqual(parsed[68].name, 'sigs.k8s.io/yaml')
		assert.strictEqual(parsed[68].version, 'v1.3.0')
	})

	it('Test parsing a go file without import statement', () => {
		const parsed = parseGoFileImports(goFileContentNoImport)
		assert.strictEqual(parsed.length, 0)
	})

	it('Test parsing a go file with single import statement', () => {
		const parsed = parseGoFileImports(goFileContentSingleImport)
		assert.strictEqual(parsed.length, 1)
		assert.strictEqual(parsed[0].name, 'fmt')
		assert.strictEqual(parsed[0].alias, '')
	})

	it('Test parsing a go file with multi import statement', () => {
		const parsed = parseGoFileImports(goFileContentMultiImport)
		assert.strictEqual(parsed.length, 3)
		assert.strictEqual(parsed[0].name, 'fmt')
		assert.strictEqual(parsed[0].alias, '')
		assert.strictEqual(parsed[1].name, 'os')
		assert.strictEqual(parsed[1].alias, 'o')
		assert.strictEqual(parsed[2].name, 'strings')
		assert.strictEqual(parsed[2].alias, '')
	})

	it('Test parsing a more complex go file', () => {
		const parsed = parseGoFileImports(goFileContentMoreComplex)
		assert.strictEqual(parsed.length, 15)
		assert.strictEqual(parsed[0].name, 'context')
		assert.strictEqual(parsed[0].alias, '')
		assert.strictEqual(parsed[1].name, 'flag')
		assert.strictEqual(parsed[1].alias, '')
		assert.strictEqual(parsed[2].name, 'os')
		assert.strictEqual(parsed[2].alias, '')
		assert.strictEqual(parsed[3].name, 'go.uber.org/zap/zapcore')
		assert.strictEqual(parsed[3].alias, '')

		assert.strictEqual(parsed[11].name, 'github.com/oceanbase/ob-operator/api/v1alpha1')
		assert.strictEqual(parsed[11].alias, 'v1alpha1')

	})

	it('Test finding import position in go file with no import statement', () => {
		const pos = findImportPos(goFileContentNoImport, "testing")
		assert.strictEqual(pos.type, ImportPosType.NoImport)
		assert.strictEqual(pos.start, 4)
	})

	it('Test finding import position in go file with single import statement', () => {
		const pos = findImportPos(goFileContentSingleImport, "testing")
		assert.strictEqual(pos.type, ImportPosType.SingleImport)
		assert.strictEqual(pos.start, 5)
	})

	it('Test finding import position in go file with single import statement, and the module is already imported', () => {
		const pos = findImportPos(goFileContentSingleImport, "fmt")
		assert.strictEqual(pos.type, ImportPosType.AlreadyImported)
	})

	it('Test finding import position in go file with multi import statement', () => {
		const pos = findImportPos(goFileContentMultiImport, "testing")
		assert.strictEqual(pos.type, ImportPosType.MultiImport)
		assert.strictEqual(pos.start, 2)
		assert.strictEqual(pos.end, 6)
	})

	it('Test more complex importing position', () => {
		const pos = findImportPos(goFileContentMoreComplex, "testing")
		assert.strictEqual(pos.type, ImportPosType.MultiImport)
		assert.strictEqual(pos.start, 18)
	})

	it('Test more complex importing position with already imported module', () => {
		const pos = findImportPos(goFileContentMoreComplex, "sigs.k8s.io/controller-runtime/pkg/log/zap")
		assert.strictEqual(pos.type, ImportPosType.AlreadyImported)
	})

	it('Test parse go mod info with complex go.mod', () => {
		const parsed = parseGoModInfo(goModContentComplex)
		assert.strictEqual(parsed.module, 'github.com/some-repo/k8s-operator')
		assert.strictEqual(parsed.goVersion, '1.20')
		assert.strictEqual(parsed.requirements.length, 69)
		assert.strictEqual(parsed.requirements[0].name, 'github.com/go-logr/logr')
		assert.strictEqual(parsed.requirements[0].version, 'v1.2.4')
		assert.strictEqual(parsed.requirements[68].name, 'sigs.k8s.io/yaml')
		assert.strictEqual(parsed.requirements[68].version, 'v1.3.0')
	})
})