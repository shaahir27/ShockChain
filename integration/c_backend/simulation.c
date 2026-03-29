#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_NODES 10
#define NAME_LEN 50

// ---------------- NODE STRUCT ----------------
typedef struct {
    char name[NAME_LEN];
    float supply;
} Node;

// ---------------- GRAPH ----------------
Node nodes[MAX_NODES] = {
    {"Oil", 100},
    {"India", 100},
    {"Manufacturing", 100}
};

int adj[MAX_NODES][MAX_NODES] = {0};
int node_count = 3;

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
    // Oil → India → Manufacturing
    adj[0][1] = 1;
    adj[1][2] = 1;
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

                float transfer = impact[curr] * 0.5; // simple propagation
                impact[i] += transfer;

                if(impact[i] > 100) impact[i] = 100;

                if(!visited[i]) {
                    queue[rear++] = i;
                    visited[i] = 1;
                }
            }
        }
    }

    // ---------------- OUTPUT (VERY IMPORTANT) ----------------
    for(int i = 0; i < node_count; i++) {

        float remaining = nodes[i].supply - impact[i];
        if(remaining < 0) remaining = 0;

        printf("%s:%.0f", nodes[i].name, remaining);

        if(i != node_count - 1)
            printf(";");
    }
}

// ---------------- MAIN ----------------
int main() {

    char node_name[NAME_LEN];
    char shock_type[NAME_LEN]; // not used but kept for compatibility
    float reduction;

    // Read input from Flask
    // Example input: Oil sanction 30
    if(scanf("%s %s %f", node_name, shock_type, &reduction) != 3) {
        printf("Error");
        return 1;
    }

    init_graph();

    int source = find_node(node_name);

    if(source == -1) {
        printf("Error");
        return 1;
    }

    simulate(source, reduction);

    return 0;
}