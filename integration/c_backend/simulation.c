#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_NODES 20
#define NAME_LEN 50

// ---------------- NODE STRUCT ----------------
typedef struct {
    char name[NAME_LEN];
    float supply;
} Node;

// ---------------- GRAPH ----------------
Node nodes[MAX_NODES] = {
    {"MiddleEast_Oil", 100},
    {"India_Oil", 100},
    {"China_Oil", 100},
    {"SouthKorea_Oil", 100},
    {"USA_Oil", 100},
    {"UK_Oil", 100},
    {"Vietnam_Oil", 100}
};

int adj[MAX_NODES][MAX_NODES] = {0};
int node_count = 7;

// ---------------- FIND NODE ----------------
int find_node(char *name) {
    for(int i = 0; i < node_count; i++) {
        if(strcmp(nodes[i].name, name) == 0)
            return i;
    }
    return -1;
}

// ---------------- INIT GRAPH ----------------
void init_graph() {

    // MiddleEast_Oil impacts
    adj[0][1] = 1; // India_Oil
    adj[0][2] = 1; // China_Oil

    // China_Oil impacts
    adj[2][3] = 1; // SouthKorea_Oil
    adj[2][4] = 1; // USA_Oil
    adj[2][6] = 1; // Vietnam_Oil

    // SouthKorea_Oil impacts
    adj[3][4] = 1; // USA_Oil

    // USA_Oil impacts
    adj[4][5] = 1; // UK_Oil
}

// ---------------- SIMULATION ----------------
void simulate(int source, float reduction) {

    float impact[MAX_NODES] = {0};
    int visited[MAX_NODES] = {0};

    int queue[MAX_NODES];
    int front = 0, rear = 0;

    impact[source] = reduction;
    queue[rear++] = source;
    visited[source] = 1;

    while(front < rear) {

        int curr = queue[front++];

        for(int i = 0; i < node_count; i++) {

            if(adj[curr][i] > 0) {

                float transfer = impact[curr] * 0.5;

                // ✅ Improved: prevent unrealistic stacking
                if(impact[i] < transfer)
                    impact[i] = transfer;

                if(impact[i] > 100)
                    impact[i] = 100;

                if(!visited[i]) {
                    queue[rear++] = i;
                    visited[i] = 1;
                }
            }
        }
    }

    // ---------------- OUTPUT ----------------
    for(int i = 0; i < node_count; i++) {

        float remaining = nodes[i].supply - impact[i];
        if(remaining < 0) remaining = 0;

        printf("%s:%.0f", nodes[i].name, remaining);

        if(i != node_count - 1)
            printf(";");
    }

    // ✅ IMPORTANT: flush output for Flask
    fflush(stdout);
}

// ---------------- MAIN ----------------
int main() {

    char country[NAME_LEN];
    char resource[NAME_LEN];
    char shock_type[NAME_LEN];
    float reduction;

    // Expected input:
    // MiddleEast Oil sanction 30
    if(scanf("%s %s %s %f", country, resource, shock_type, &reduction) != 4) {
        printf("Error");
        return 1;
    }

    init_graph();

    char node_key[NAME_LEN];

    // ✅ CRITICAL FIX: unified naming
    sprintf(node_key, "%s_%s", country, resource);

    int source = find_node(node_key);

    if(source == -1) {
        printf("Error");
        return 1;
    }

    simulate(source, reduction);

    return 0;
}