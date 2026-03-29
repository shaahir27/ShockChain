#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_NODES 50
#define MAX_LAYERS 10
#define NAME_LEN 50

// ---------------- NODE STRUCT ----------------
typedef struct {
    char name[NAME_LEN];
    int is_exporter;
    float gdp_factor[MAX_LAYERS];
} Node;

// ---------------- GRAPH STRUCT ----------------
typedef struct {
    float adj[MAX_LAYERS][MAX_NODES][MAX_NODES];
    char commodities[MAX_LAYERS][NAME_LEN];
    Node nodes[MAX_NODES];

    int node_count;
    int layer_count;
} Graph;

// ---------------- FIND NODE ----------------
int find_node(Graph *g, char *name) {
    int i;
    for(i = 0; i < g->node_count; i++) {
        if(strcmp(g->nodes[i].name, name) == 0)
            return i;
    }
    return -1;
}

// ---------------- LOAD COMMODITIES ----------------
void load_commodities(Graph *g, char *filename) {

    FILE *fp = fopen(filename, "r");
    char name[NAME_LEN];

    if(!fp) {
        printf("Error opening commodities file\n");
        exit(1);
    }

    while(fscanf(fp, "%s", name) != EOF) {

        if(name[0] == '#') continue;

        strcpy(g->commodities[g->layer_count], name);
        g->layer_count++;
    }

    fclose(fp);
}

// ---------------- LOAD NODES ----------------
void load_nodes(Graph *g, char *filename) {

    FILE *fp = fopen(filename, "r");

    char name[NAME_LEN], type[20];
    float factors[MAX_LAYERS];
    float annual_import;

    int i;

    if(!fp) {
        printf("Error opening nodes file\n");
        exit(1);
    }

    while(1) {

        if(fscanf(fp, "%s", name) == EOF)
            break;

        if(name[0] == '#') {
            fgets(name, sizeof(name), fp);
            continue;
        }

        fscanf(fp, "%s", type);

        for(i = 0; i < g->layer_count; i++) {
            fscanf(fp, "%f", &factors[i]);
        }

        fscanf(fp, "%f", &annual_import);

        strcpy(g->nodes[g->node_count].name, name);
        g->nodes[g->node_count].is_exporter =
            (strcmp(type, "exporter") == 0);

        for(i = 0; i < g->layer_count; i++) {
            g->nodes[g->node_count].gdp_factor[i] = factors[i];
        }

        g->node_count++;
    }

    fclose(fp);
}

// ---------------- LOAD EDGES ----------------
void load_edges(Graph *g) {

    int layer, i, j;
    FILE *fp;

    char filename[100];
    char src[NAME_LEN], dest[NAME_LEN];
    float weight;

    for(layer = 0; layer < g->layer_count; layer++) {

        sprintf(filename, "edges_%s.txt", g->commodities[layer]);

        fp = fopen(filename, "r");

        if(!fp) {
            printf("Warning: %s not found\n", filename);
            continue;
        }

        while(fscanf(fp, "%s %s %f", src, dest, &weight) != EOF) {

            if(src[0] == '#') continue;

            i = find_node(g, src);
            j = find_node(g, dest);

            if(i == -1 || j == -1) {
                printf("Invalid edge: %s -> %s\n", src, dest);
                continue;
            }

            g->adj[layer][i][j] = weight;
        }

        fclose(fp);
    }
}

// ---------------- INIT GRAPH ----------------
void init_graph(Graph *g) {

    int l, i, j;

    g->node_count = 0;
    g->layer_count = 0;

    for(l = 0; l < MAX_LAYERS; l++)
        for(i = 0; i < MAX_NODES; i++)
            for(j = 0; j < MAX_NODES; j++)
                g->adj[l][i][j] = 0;

    load_commodities(g, "commodities_list.txt");
    load_nodes(g, "nodes.txt");
    load_edges(g);
}

// ---------------- SIMULATION ----------------
void simulate(Graph *g, int layer, float reduction, int source) {

    float impact[MAX_NODES] = {0};
    int visited[MAX_NODES] = {0};

    int queue[MAX_NODES];
    int front = 0, rear = 0;

    int curr, j, i;

    impact[source] = reduction;
    queue[rear++] = source;
    visited[source] = 1;

    while(front < rear) {

        curr = queue[front++];

        for(j = 0; j < g->node_count; j++) {

            if(g->adj[layer][curr][j] > 0) {

                float transfer = impact[curr] * g->adj[layer][curr][j];
                impact[j] += transfer;

                printf("\n[DEBUG] %s -> %s : %.2f%%",
                       g->nodes[curr].name,
                       g->nodes[j].name,
                       transfer);

                if(!visited[j]) {
                    queue[rear++] = j;
                    visited[j] = 1;
                }
            }
        }
    }

    printf("\n\n===== RESULTS (%s) =====\n",
           g->commodities[layer]);

    for(i = 0; i < g->node_count; i++) {

        if(g->nodes[i].is_exporter) continue;

        float gdp_loss = impact[i] * g->nodes[i].gdp_factor[layer];
        float price_increase = impact[i];

        printf("\nCountry: %s\n", g->nodes[i].name);
        printf("Total Impact: %.2f%%\n", impact[i]);
        printf("GDP Loss: %.2f%%\n", gdp_loss);
        printf("Price Increase Needed: %.2f%%\n", price_increase);
    }
}

// ---------------- MAIN ----------------
int main() {

    Graph g;

    int i;
    int choice;
    int exporter;
    float reduction;

    init_graph(&g);

    printf("\nAvailable Commodities:\n");
    for(i = 0; i < g.layer_count; i++) {
        printf("%d. %s\n", i, g.commodities[i]);
    }

    printf("\nSelect commodity index: ");
    scanf("%d", &choice);

    if(choice < 0 || choice >= g.layer_count) {
        printf("Invalid commodity\n");
        return 0;
    }

    printf("\nAvailable Exporters:\n");
    for(i = 0; i < g.node_count; i++) {
        if(g.nodes[i].is_exporter) {
            printf("%d. %s\n", i, g.nodes[i].name);
        }
    }

    printf("\nSelect exporter index: ");
    scanf("%d", &exporter);

    if(!g.nodes[exporter].is_exporter) {
        printf("Invalid exporter\n");
        return 0;
    }

    printf("Enter export reduction percentage: ");
    scanf("%f", &reduction);

    simulate(&g, choice, reduction, exporter);

    return 0;
}
